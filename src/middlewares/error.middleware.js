import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

const errorHandler = (err,req,res,next)=>{
    let error;
    if(!(err instanceof ApiError))
    {
        const statusCode = err.statusCode || (err instanceof mongoose.Error ? 400 : 500);
        const message = "Something Went Wrong" || err.message
        error = new ApiError(statusCode,message,err?.errors || [],err.stack)
    }

    const response = {...error};
    return res.status(err.statusCode).json(response)
}

export {errorHandler}