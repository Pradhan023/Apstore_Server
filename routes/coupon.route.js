import e from "express";
import { protectedroute } from "../middleware/auth.middleware.js";
import { getCouponController, validateCouponController } from "../controller/coupon.controller.js";

const route = e.Router();

route.get("/", protectedroute , getCouponController)
route.post("/validate", protectedroute , validateCouponController)

export default route