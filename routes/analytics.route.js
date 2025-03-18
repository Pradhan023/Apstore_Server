import e from "express";
import { dailysalesData, getanalyticsData } from "../controller/analytics.controller.js";
import { adminroute, protectedroute } from "../middleware/auth.middleware.js";

const route = e.Router();   

route.get("/", protectedroute , adminroute , async (req,res) => {
    //  we want total number of users and total number of products and total number of orders and total revinue
    try {
      const analyticsData = await getanalyticsData();
  
      // data for last 7 days
      const endDate = new Date(); // current date
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const dailysales = await dailysalesData(startDate, endDate);
      return res.status(200).json({ success: true, analyticsData, dailysales });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  })

export default route