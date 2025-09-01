class ApiError  extends Error{
    constructor(statusCode , message="Something Went Wrong" , error=[],stack)
    {
        super(message)
        this.statusCode = statusCode;
        this.message = message;
        this.error=this.error
        this.success = (statusCode < 300) ? true  : false
        if(this.stack)
            {
                this.stack = stack;
            }
        else{
            this.stack = Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError};