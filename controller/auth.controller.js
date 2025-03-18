import { User } from "../model/user.model.js"; 
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";


const generateToken = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_SECRET_KEY, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_SECRET_KEY, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

// store refresh token and user._id to redis
const storeRefreshToken = async (userId,refreshToken) => {
  // key,value,optional can include expiration time in key value pair(ttl-time to live) - refresh_token:${userId}`,refreshToken,"EX",7*24*60*60
  await redis.set(
    `refresh_token:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60
  ); //EX should be in capital letter
};
// set cookie
const setCookie = (res,accessToken,refreshToken) => {
  
  res.cookie("accessToken", accessToken, {
    httpOnly: true, //prevent Xss attacks ,cross site scripting attack
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", //prevent CSRF attacks , cross site request forgery attack
    maxAge: 15 * 60 * 1000, //15mins
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, //prevent Xss attacks ,cross site scripting attack
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", //prevent CSRF attacks , cross site request forgery attack
    maxAge: 7 * 24 * 60 * 60 * 1000, //7days
  });
};

//Promise<Response | void> this means this fun might return nothing (void) or res.json (Response)
export const signupController = async (req,res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check for existing user
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: role || "customer",
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "User successfully registered",
    });
  } catch (err) {
    console.error("Signup Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return res.status(500).json({
      success: false,
      message: "Error occured. Please try again.",
      error: errorMessage,
    });
  }
};

// Stub implementations for other controllers
export const signinController = async (req,res) => {
  // api/auth/login - comparepassword with comparePassword method in user model - generate accesstoke with 15m ex and refresh token with 7d - set both in cookies
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email is Invalid",
      });
    }
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Password is Invalid",
      });
    }

    // token
    const { accessToken, refreshToken } = generateToken(user.id);
    // store in redis
    await storeRefreshToken(user.id, refreshToken);
    // set in cookie the accesstoken andrefresh token
    setCookie(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "User successfully logged in",
    });
  } catch (err) {
    console.error("Signin Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return res.status(500).json({
      success: false,
      message: "Error occured. Please try again.",
      error: errorMessage,
    });
  }
};

export const logoutController = async (req,res)=> {
  // api/auth/logout - clear refresh token from redis - clear acccess and refresh token from cookie
  try {
    // for to delete the refresh token from redis
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const { userId } = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY); //By adding the as JwtPayload type assertion, you're telling TypeScript that you're certain that the value returned by jwt.verify() is a JwtPayload object with a userId property.
      await redis.del(`refresh_token:${userId}`); //delete refresh token from redis with key refresh_token:${decodetoken}
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(200).json({
      success: true,
      message: "User successfully logged out",
    });
  } catch (err) {
    console.error("Signup Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return res.status(500).json({
      success: false,
      message: "Error occured. Please try again.",
      error: errorMessage,
    });
  }
};

export const refreshTokenController = async (req,res)=> {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Unathorized,No refresh token",
      });
    }
    const { userId } = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY) ;
    const redistoken = await redis.get(`refresh_token:${userId}`);
    if (!redistoken || redistoken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }
    const newAccesstoken = jwt.sign(
      { userId: userId },
      process.env.ACCESS_SECRET_KEY ,
      {
        expiresIn: "15m",
      }
    );
    res.cookie("accessToken", newAccesstoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });
    return res.status(201).json({
      success: true,
      message: "Access Token is successfully refreshed",
    });
  } catch (err) {
    console.error("Refresh Token Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return res.status(500).json({
      success: false,
      message: "Error occured. Please try again.",
      error: errorMessage,
    });
  }
};

export const getprofile = async (req,res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    })
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}



