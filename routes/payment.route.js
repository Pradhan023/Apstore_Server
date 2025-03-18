import e from "express";
import { protectedroute } from "../middleware/auth.middleware.js";
import { checkoutSuccess, createCheckoutSession } from "../controller/payment.controller.js";
const route = e.Router();


route.post("/create-checkout-session",protectedroute,createCheckoutSession)
route.post("/checkout-success",protectedroute,checkoutSuccess)

export default route