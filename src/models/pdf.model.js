import mongoose from 'mongoose'

const pageSchema = new mongoose.Schema({
    pageNumber:{
        type:Number,
        required:true
    },
    content:{
        type:String,
        required:true
    }
})

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
    text:{
        type:[pageSchema],
        default:[]
    },
    totalPages:{
        type:Number
    }
},{
    timestamps:true
})

export const PDF = mongoose.model('PDF',pdfSchema)