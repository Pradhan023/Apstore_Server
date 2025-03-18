import { Coupon } from "../model/coupon.model.js";

export const getCouponController = async (req,res)=> {
    try {
        const coupon = await Coupon.find({userId:req.user?._id})

        if(coupon.length === 0){
            return res.status(404).json({
                success: true,
                data: null 
            })
        }
        return res.status(200).json({
            success: true,
            data: coupon 
        })
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
export const validateCouponController = async (req,res)=> {
    try {
        const {code} = req.body;
        const coupon = await Coupon.find({code:code,userId:req.user?._id,isActive:true})

        if(!coupon){
            return res.status(404).json({
                success: false,
                message: "No Coupon Available",
            })
        }
        // when you use the find() method of Mongoose, it returns an array of documents that match the query. So, the type of coupon is (Document<unknown, {}, ICoupon> & ICoupon & Required<{ _id: unknown; }> & { __v: number; })[], which is an array of documents that conform to the ICoupon interface. However, when you try to access the expirationDate property, TypeScript complains because expirationDate is not a property of an array. It's a property of a single document.
        if(coupon[0]?.expirationDate < new Date()){ //in this line we are checking if the expirationDate of the coupon is less than the current date if it is then it means that the coupon is expired if it is not then it means that the coupon is not expired i.e (22/2/2025) < (22/3/2025) - here expiration date which is left side is less than the current date which is right side means its expired
            coupon[0].isActive = false; // update isActive field to false if coupon is expired  
            await coupon[0].save();
            return res.status(400).json({
                success: false,
                message: "Coupon is expired",
            })
        }
        return res.status(200).json({
            success: true,
            message : "Coupon is Available",
            code:coupon[0].code,
            discountPercentages:coupon[0].discountPercentages 
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
