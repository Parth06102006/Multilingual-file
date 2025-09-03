import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from 'jsonwebtoken'
import { User } from "../models/user.model.js";

export const authHandler = asyncHandler(async(req,res,next)=>{
        const token = req.cookies?.token ||
        (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1]: null) || req.body?.token;
        if(!token)
        {
            throw new ApiError(400,'No Token Found')
        }
        const userId = jwt.verify(token,process.env.JWT_SECRET_KEY)._id;
        const existingUser = await User.findById(userId);
        if(!existingUser)
        {
            throw new ApiError(401,'User not found');
        }
        req.user = existingUser._id;
        next();
})