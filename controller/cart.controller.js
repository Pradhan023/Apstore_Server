import { Product } from "../model/product.model.js";

// get cart product from db or redis
export const getProductfromCartController = async (req,res) => {
  try {
    const products = await Product.find({
      _id: { $in: req.user?.cartItems.map((item) => item.product) },
    }); //$in is used to get all the products which are in cartItems array of user model and $in is a mongoose operator which is used to get all the products which are in cartItems array of user model
    // these products have no quantity we have to add the quantity of each product from cartItems array of user model
    //$in is basically matches the value return all the document which are in the array
    const cartItems = products?.map((product) => {
      const item = req.user?.cartItems.find(
        (item) => item.product.toString() === product._id.toString()  // both item.product and product._id is mongoose type of  object id and we cant compare them ts gives error of unintensional comparsion  so we have to convert it in string and then comapare
      ); // find the item in cartItems array of user model which has same product id as product._id
      return { ...product.toJSON(), quantity: item?.quantity }; // return the product with quantity ,  proudct is a mongoose object so we have to convert it to normal javascript object using toJSON() method
    });
    return res.status(200).json({
      success: true,
      data: cartItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// add product to cart
export const addProductToCartController = async (req,res) => {
  try {
    const { productId } = req.body;
    const user = req.user;
    if (user) {
      const exisitingItem = user.cartItems.find(
        (item) => item.product.toString() === productId   //so productId is string and item.product is Type of objectId so which cant compare for the result convert the item.product to string
      );
      if (exisitingItem) {
        exisitingItem.quantity += 1;
      } else {
        user.cartItems.push({ product: productId, quantity: 1 });
      }
      await user.save();
      return res.status(200).json({
        success: true,
        data: user.cartItems,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//  delete product from cart whether if its quantity is 1 or more or product is different
export const removeProductfromCartController = async (req,res)=> {
  try {
    const { productId } = req.body;
    const user = req.user;
    if (user) {
      user.cartItems = user.cartItems.filter(
        (item) => item.product.toString() !== productId
      );
      await user.save();
      return res.status(200).json({
        success: true,
        data: user.cartItems,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// update quantity of product
export const updateQuantityfromCartController = async (req,res)=> {
  try {
    const { id: productId } = req.params; //id params is in string
    const { quantity } = req.body;
    const user = req.user;
    if (user) {
      const exisitingItem = user.cartItems.find(
        (item) => item.product.toString() === productId
      ); //items.product is in mongoose object id to compare any of them we have to convert any of them to one type either string(toString) or mongoose id(new mongoose.Types.ObjectId(id))
      if (exisitingItem) {
        if (quantity === 0) {
          user.cartItems = user.cartItems.filter(
            (item) => item.product.toString() !== productId
          );
          await user.save();
          return res.status(200).json({
            success: true,
            data: user.cartItems,
          });
        }
        exisitingItem.quantity = quantity;
        await user.save();
        return res.status(200).json({
          success: true,
          data: user.cartItems,
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
