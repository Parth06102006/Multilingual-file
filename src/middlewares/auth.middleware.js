import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import jwt from 'jsonwebtoken'
import { User } from "../models/user.model";

export const authHandler = asyncHandler(async(req,res,next)=>{
    try {
        const token = req.body.token || req.cookies.token || req.headers.authorization.replace('Bearer ','');
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
        req.user = userId;
        next()
    } catch (error) {
        throw new ApiError(400,'User is not authenticated')
    };
})