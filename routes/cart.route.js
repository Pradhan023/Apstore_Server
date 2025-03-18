import e from "express";
import { protectedroute } from "../middleware/auth.middleware.js";
import { addProductToCartController, getProductfromCartController, removeProductfromCartController, updateQuantityfromCartController } from "../controller/cart.controller.js";

const route = e.Router();

route.get('/',protectedroute,getProductfromCartController)
route.post('/',protectedroute,addProductToCartController)
route.delete('/',protectedroute,removeProductfromCartController)
route.put('/:id',protectedroute,updateQuantityfromCartController)

export default route