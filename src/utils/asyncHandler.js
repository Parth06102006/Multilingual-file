export const asyncHandler = async(requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res)).catch(next)
    }
}