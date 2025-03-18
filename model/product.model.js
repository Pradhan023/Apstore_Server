import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    image:{
        url:{
            type:String,
            required:true
        },
        publicId:{
            type:String,
            required:true
        }
    },
    price:{
        type:Number,
        required:true,
        min:0
    }, 
    category:{
        type:String,
        required:true
    },
    isFeatured:{
        type:Boolean,
        default:false
    }
},{ timestamps : true });


const Product = mongoose.model("Product",productSchema);

export { Product };