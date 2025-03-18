import express from "express";
import { logoutController, signinController, signupController ,refreshTokenController, getprofile } from "../controller/auth.controller.js";
import { protectedroute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signupController);
router.post("/signin", signinController);
router.post("/logout", logoutController);
router.post("/refresh-token", refreshTokenController);
router.get("/profile",protectedroute,getprofile)

export default router;
