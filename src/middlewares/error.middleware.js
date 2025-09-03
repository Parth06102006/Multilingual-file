import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

const errorHandler = (err, req, res, next) => {
    // always start with the original error
    let error = err;

    // if it's not already an ApiError, wrap it
    if (!(err instanceof ApiError)) {
        const statusCode = err.statusCode || (err instanceof mongoose.Error ? 400 : 500);
        const message = err.message || "Something Went Wrong";
        error = new ApiError(statusCode, message, err?.errors || [], err.stack);
    }

    // build safe response
    const response = {
        statusCode: error.statusCode || 500,
        message: error.message,
        errors: error.errors || [],
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    };

    return res.status(response.statusCode).json(response);
};

export { errorHandler };
