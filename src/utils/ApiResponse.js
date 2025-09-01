class ApiResponse{
    constructor(statusCode , message="Successfull" , data = "")
    {
        this.success = (statusCode < 300) ? true  : false
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }
}

export {ApiResponse};