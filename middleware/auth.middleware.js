import jwt from "jsonwebtoken";
import { User } from "../model/user.model.js";


export const protectedroute = async(req,res,next)=>{
    try{
        const token = req.cookies.accessToken;
        if(!token){
            return res.status(401).json({
                success:false,
                message:"Unthorized, No access token Provided"
            })
        }
        const decoded = jwt.verify(token,process.env.ACCESS_SECRET_KEY)
        const user = await User.findOne({_id:decoded.userId}).select("-password"); //- ignore password
        if(!user){
            return res.status(401).json({
                success:false,
                message:"User not found"
            })
        }
        req.user = user;
        next()
    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}

export const adminroute = async(req,res,next)=>{
    if(req.user?.role === "admin"){
        next();
    }
    else{
        return res.status(403).json({
            success:false,
            message:"Forbidden , Admin Only"
        })
    }
}