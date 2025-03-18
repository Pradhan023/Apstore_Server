import { Coupon } from "../model/coupon.model.js";
import { User } from "../model/user.model.js";
import { stripe } from "../lib/stripe.js";
import dotenv from "dotenv";
import { Order } from "../model/order.model.js";
import mongoose from "mongoose";

dotenv.config();

export const createCheckoutSession = async (req, res) => {
  try {
    // product (in array) and couponCode if user have in body
    const { products, couponCode } = req.body;
    // check whether the product type is valid or not in form of array or not
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        error: "Invalid or empty Product data",
      });
    }

    // calculate total amount
    let totalamount = 0;

    // lineItems is strip name convention
    const lineItems = products.map((product) => {
      // converting price to cent or paisa
      const amount = Math.round(product.price * 100); // strips wants you to send in cent or paisa for inr thats why we have to multi with 100
      totalamount += amount * product.quantity;

      // return the object in which format strips wants
      return {
        price_data: {
          currency: "inr", // it can be inr or usd or any other currency
          product_data: {
            name: product.name,
            images: [product.image?.url], //  array of images ,can be multiple images
          },
          unit_amount: amount,
        },
        quantity: product.quantity || 1,
      };
    });

    // coupon
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
        userId: req.user?.id,

        isActive: true,
      });
      if (coupon) {
        totalamount -= Math.round(
          (totalamount * coupon.discountPercentages) / 100
        );
      }
    }

    // create session for payment , it will redirect to strip payment page , with this session id which we will get from here
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // it can be card or any other payment method like netbanking
      line_items: lineItems,
      mode: "payment", // it can be payment or subscription
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`, // it will redirect to success page after successful payment
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
      discounts: coupon
        ? [
            {
              coupon: await createStripcoupon(coupon.discountPercentages), // it will create a coupon in strip and return the id of the coupon which will be used for discount , coupon is naming convention in strip
            },
          ]
        : [],

      custom_fields: [
        {
          key: "customer_name",
          label: {
            type: "custom",
            custom: "Full Name (as per GST)",
          },
          type: "text",
          optional: true,
        },
        {
          key: "business_address",
          label: {
            type: "custom",
            custom: "Registered Business Address",
          },
          type: "text",
          optional: true,
        },
        {
          key: "pan_number",
          label: {
            type: "custom",
            custom: "PAN Number",
          },
          type: "text",
          optional: true,
          numeric: {
            minimum_length: 10,
            maximum_length: 10,
          },
        },
      ],

      billing_address_collection: "required",

      metadata: {
        // it is used to store the additional information like user id and coupon code in metadata , metadata is naming convention in strip
        userId: req.user?.id ?? null,
        couponCode: couponCode || "",
        products: JSON.stringify(
          products.map((item) => ({
            product: item._id,
            quantity: item.quantity,
            price: item.price,
          }))
        ),
      },
    });

    // create coupon only if customer is buying more than 200 or any amount then discounted coupon will work for next purchase
    if (totalamount >= 2000) {
      //200*100 = 2000  , 100 is cent strip understand in this way
      await createnewCoupon(req.user?.id);
    }

    return res.status(200).json({
      id: session.id, // with this session id we will to redirect to the strip payment page
      totalAmount: totalamount / 100, // so that we can get in dollars not in cent or paisa
    });
  } catch (error) {
    console.log("Error in creating checkout session", error);
    return res.status(500).json({
      success: false,
      message: "Error in creating checkout session",
      error: error.message,
    });
  }
};

//  user will be redirected to this page after successful payment , user wants to check the status of the payment is success or not , for this we create order in our database
export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body; // it will get the session id from the body which we get from the strip payment page after successful payment , this will use to get the status of the payment
    const session = await stripe.checkout.sessions.retrieve(sessionId); // it will get the status of the payment

    if (session.payment_status === "paid") {
      // it will check the status of the payment is paid or not
      // deactivate the coupon so that user can not use it again
      if (session?.metadata) {
        if (session.metadata?.couponCode) {
          await Coupon.findOneAndUpdate(
            {
              code: session.metadata?.couponCode,
              userId: session.metadata?.userId,
            },
            { isActive: false }
          );
        }

        
        const products = JSON.parse(session.metadata?.products);

        // check
        const existingOrder = await Order.findOne({
          stripeSessionId: sessionId,
        });
        if (existingOrder) {
          // Order already exists,
          const newOrder = await Order.findOneAndUpdate(
            { stripeSessionId: sessionId },
            {
              user: session.metadata?.userId,
              products: products.map((item) => ({
                product: item.product,
                quantity: item.quantity,
                price: item.price,
              })),
              totalAmount: session?.amount_total
                ? session.amount_total / 100
                : 0,
              stripeSessionId: sessionId,
            },
            { upsert: true, new: true }
          );
          return res.status(200).json({
            success: true,
            message: "Order already created",
            orderId: existingOrder._id,
          });
        }
        //   create order in our database
        const orderId = new mongoose.Types.ObjectId();
        const neworder = new Order(
          {
            _id: orderId,
            user: req.user._id,
            user: session.metadata?.userId,
            products: products.map((item) => ({
              product: item.product,
              quantity: item.quantity,
              price: item.price,
            })),
            //amount_total property is marked as optional in the Stripe API documentation, which means that it may not always be present in the response. so we have to check if it is present or not null check
            totalAmount: session?.amount_total ? session.amount_total / 100 : 0, // amount_total is in cent strip understand in this way so we have to convernt in dollar or ruppe by dividing it by 100 also amount_total property is total or order amount which strip will give us
            stripeSessionId: sessionId,
          },
          { upsert: true, new: true } // it will update the order if it already exists or create a new one
        );

        await neworder.save();

        await clearUserCart(session.metadata.userId);

        return res.status(200).json({
          success: true,
          message: "Payment successfull ,Order created successfully",
          orderId: neworder._id,
        });
      }
    }
  } catch (error) {
    console.error("Error in processing successful checkout", error);
    return res.status(500).json({
      success: false,
      message: "Error in processing successful checkout",
      error: error.message,
    });
  }
};

async function createStripcoupon(discountpercentage) {
  const coupon = await stripe.coupons.create({
    // it will create a coupon in strip and return the id of the coupon
    name: "discount", // it can be any name
    percent_off: discountpercentage, //
    duration: "once", // it can be once or recurring
  });
  return coupon.id;
}

async function createnewCoupon(userId) {
  await Coupon.deleteOne({ userId: userId });
  // create new coupon
  const newcoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    discountPercentages: 10,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), //30days from now
    userId: userId,
  });
  await newcoupon.save();
  return newcoupon;
}

// clear cart after succesfull payment
const clearUserCart = async (userId) => {
  try {
    //     The findByIdAndUpdate() function searches for the user with the given userId.
    // It sets cartItems to an empty array, effectively removing all items.
    // The { new: true } option ensures that Mongoose returns the updated document.
    await User.findByIdAndUpdate(userId, { cartItems: [] }, { new: true });
  } catch (error) {
    console.error("Error clearing cart items:", error);
  }
};
