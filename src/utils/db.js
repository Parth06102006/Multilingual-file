import mongoose from "mongoose";

export const dbConnect = async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}`)
        console.log('Database Connected Successfully')
    } catch (error) {
        console.log('Error Connecting to the Database')
        process.exit(1)
    }
}