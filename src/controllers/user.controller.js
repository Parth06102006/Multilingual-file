import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError'
import { ApiResponse } from '../utils/ApiResponse'
import {User} from '../models/user.model.js'
import bcrypt from 'bcryptjs'

const signup = asyncHandler(async(req,res)=>{
    try {
            const {username,email,password} = req.body;
        
            //Check if the details are complete or not
            if([username,email,password].some(t=>t?.trim()===''))
            {
                throw new ApiError(400,'Kindly Complete all the Details');
            }
            
            //Check if the user already exists or not
            const existingUser = await User.findOne({username,email});
            if(existingUser)
            {
                throw new ApiError(401,'User Already Exists');
            }
        
            //If user exists then hash the password
            let hashPassword;
            try {
                hashPassword = bcrypt.hashSync(password);
            } catch (error) {
                throw new ApiError(500,'Unable to hash the Password');
            }
        
        
            //Creating new User
            try {
                const newUser = await User.create({username,email,password:hashPassword});
                if(!newUser)
                {
                    throw new ApiError(500,'Unable to Sigup right now')
                }
                return res.status(201).json(new ApiResponse(201,'User Created Successfully',{username,email,id:newUser._id}))
            } catch (error) {
                throw new ApiError(500,'Internal Server Error');
            }
    } catch (error) {
        throw new ApiError(500,'Internal Server Error');
    }

})

const login = asyncHandler(async(req,res)=>{
    try {
        const {email,password} = req.body;
        //Checking the details filled or not
        if(!email || !password)
        {
            throw new ApiError(400,'Kindly fill in all the details');
        }

        //Check if the user exists or not
        const existingUser = await User.findOne({email});
        if(!existingUser)
        {
            throw new ApiError('User does not exsist');
        }

        //Compare and check that is password correct or not
        const isValidPassword = await existingUser.isPasswordCorrect();
        if(!isValidPassword)
        {
            throw new ApiError(401,'Password is Incorrect');
        }

        const generatedToken = newUser.generatedToken();

        const options = {
            httpOnly:true,
            secure:(NODE_ENV === 'production') ? true : false,
            sameSite:(NODE_ENV === 'production') ? 'none' : 'lax',
            expires:new Date(Date.now()+2*24*60*60*100)
        }

        return res.status(200).cookie('token',generatedToken,options).json(new ApiResponse(200,'User Logged in Successfully',{}));

    } catch (error) {
        console.error('Error Occured while logging in =',error.message);
        throw new ApiError(500,'Internal Server Error Occured');
    }
})


const logOut = asyncHandler(async(req,res)=>{
    try {
        const userId = req.user;
        const existingUser = await User.findById(userId);
        if(!existingUser)
        {
            throw new ApiError(401,'No existing User found');
        }
        const options = {
            httpOnly:true
        }
        return res.status(200).clearCookie('token',options).json(new ApiResponse(200,'User LoggedOut Successfully'));
    } catch (error) {
        
    }
})

export {signup,login,logOut};