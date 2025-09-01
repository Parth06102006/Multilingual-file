import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        trim:true,
        lowercase:true,
        maxlength:20,
        required:true
    },
    email:{
        type:String,
        trim:true,
        unique:true,
        required:true
    },
    password:{
        type:String,
        maxlength:128,
        required:[true,"Password is required"]
    },
},{
    timestamps:true
})

export const User = mongoose.model('User',userSchema)