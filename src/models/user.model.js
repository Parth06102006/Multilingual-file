import mongoose from 'mongoose'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'

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

userSchema.methods.isPasswordCorrect = async function(password){
    return bcrypt.compareSync(password,this.password);
}

userSchema.methods.generateToken = function()
{
    const payload = {
        _id:this._id,
        username:this.username,
        email:this.email,
    }
    return jwt.sign(payload,process.env.JWT_SECRET_KEY,{
        expiresIn:process.env.JWT_TOKEN_EXPIRY
    })
}

export const User = mongoose.model('User',userSchema)