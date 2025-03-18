import { Product } from "../model/product.model.js";
import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import fs from "fs";


export const getAllProductsController = async (req,res) => {
  try {
    const products = await Product.find({});
    return res.status(200).json({
        success:true,
        data:products
    })
  } catch (err) {
    console.log("Error in getting all products", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: errorMessage,
    });
  }
};

export const getFeaturedProductsController = async (req,res)=>{
  try{
    // first of all check if data is in redis for faster response
    let cachedProducts = await redis.get("featured_Products");
    if(cachedProducts){
      return res.status(200).json({
        success:true,
        data:JSON.parse(cachedProducts) //redis data is in json string format so we need to parse it to object
      })
    }

    // if data is not in redis then fetch from db and store in redis
    let featuredProducts = await Product.find({isFeatured:true}).lean(); //lean() is used to convert mongoose object to normal javascript object ,which is good for performance without any of the Mongoose document methods, such as save(), remove(), etc.
    if(!featuredProducts.length){
      return res.status(404).json({
        success:false,
        message:"No featured products found"
      })
    }

    // now store data this data which is fetched from db in redis which will be used in next request for faster response
    await redis.set("featured_Products",JSON.stringify(featuredProducts)) //store data in redis in json string format because redis only store string format data
    return res.status(200).json({
      success:true,
      data:featuredProducts
    })
  }
  catch(err){
    console.log(err)
    return res.json({
      success:false,
      message:"Internal Server Error"
    })
  }
}

export const createProductController = async (req, res) => {
  try {
    const { name, description, price, category } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required"
      });
    }

    let imageUrl, publicId;

    if (process.env.NODE_ENV === "production") {
      // Upload from memory (Cloudinary upload_stream) 
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: "products" }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });

        stream.end(req.file.buffer);//this will upload the image to cloudinary
      });

      imageUrl = result.secure_url;
      publicId = result.public_id;
    } else {
      //  Upload from local file (development)
      const result = await cloudinary.uploader.upload(req.file.path, { folder: "products" });
      imageUrl = result.secure_url;
      publicId = result.public_id;
      
      // Delete the local file after uploading to Cloudinary
      fs.unlinkSync(req.file.path);
    }

    // Save product to DB
    const newProduct = await Product.create({
      name,
      description,
      price,
      image: { url: imageUrl, publicId },
      category
    });

    return res.status(201).json({
      success: true,
      data: newProduct
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const deleteProductController = async(req,res)=>{
  try{
    const{id} = req.params;
    const product = await Product.findById(id);
    if(!product){
      return res.status(404).json({
        success:false,
        message:"Product not found"
      })
    }

    // delete image from cloudinary
    await cloudinary.uploader.destroy(`products/${product.image?.publicId}`);
    // delete product from db
    await Product.findByIdAndDelete(id);
    return res.status(200).json({
      success:true,
      message:"Product deleted successfully"
    })
      }
  catch(err){
    console.log(err);
    return res.status(500).json({
      success:false,
      message:"Internal Server error",
      error:err.message
    })
  }
}

export const getRecommendedProductsController = async (req,res)=>{
  try{
    const recommendedProduct = await Product.aggregate([
      {
        // $sample: This stage randomly selects 3 documents (products) from the collection.
        $sample:{size:3}
      },
      {
        // $project: This stage specifies the fields to include in the output document.
        $project:{
          _id:1,
          name:1,
          description:1,
          price:1,
          image:1
        }
      }
    ]);

    return res.status(200).json({
      success:true,
      data:recommendedProduct
    })
  }
  catch(err){
    console.log(err);
    return res.status(500).json({
      success:false,
      message:"Internal Server error"
    })
  }
}

export const getProductsbyCategoryController = async(req,res)=>{
  try{
    const{category} = req.params;
    const product = await Product.find({category}).lean(); //lean() is used to convert mongoose object to normal javascript object ,which is good for performance , resulting object will not have any of the Mongoose document methods, such as save(), remove(), etc. if we dont want to modify the original object then we can use lean() method

    return res.status(200).json({
      success:true,
      data:product    
    })
  }
  catch(err){
    console.log(err);
    return res.status(500).json({
      success:false,
      message:"Internal Server error"
    })
  }
}

export const toggleFeaturedProductController = async(req,res)=>{
  try{
    const {id} = req.params;
    const product = await Product.findById(id);
    if(!product){
      return res.status(404).json({
        success:false,
        messgage:"Product not found"
      })
    }
    product.isFeatured = !product.isFeatured;  // toggle isFeatured field with true if its false and false if its true
    await product.save(); // save updated product in db
    await updateCachedFeaturedProducts(); // update cached featured products in redis
    return res.status(200).json({
      success:true,
      data:product
    })
  }
  catch(err){
    console.log(err);
    return res.status(500).json({
      success:false,
      message:"Internal Server error",
      error:err.message
    })
  }
}

async function updateCachedFeaturedProducts(){
  try {
    // lean() is used to convert mongoose object to normal javascript object
    const featuredProduct = await Product.find({isFeatured:true}).lean();
    await redis.set("featured_Products",JSON.stringify(featuredProduct));
  } catch (error) {
    console.log("Error in updating cached featured products", error);
  }
}