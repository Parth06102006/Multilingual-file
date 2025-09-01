import mongoose from 'mongoose'

const pdfSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    fileName:{
        type:String,
        trim:true,
        unique:true,
        required:true
    },
    filePath:{
        type:String,
        required:true
    },
    language:{
        type:String
    },
    totalPages:{
        type:Number
    }
},{
    timestamps:true
})

export const PDF = mongoose.model('PDF',pdfSchema)