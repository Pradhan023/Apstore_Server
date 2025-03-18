import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connection = async()=>{
    try{
        const connect = await mongoose.connect(process.env.MONGO_URI);
        console.log(`Mongodb connetcted : ${connect.connection.host}`)
    }
    catch(err){
        console.log(`ERROR CONNECTING TO MONGODB  ${err.message}`);
        process.exit(1);
    }
}

export default connection