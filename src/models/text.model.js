import mongoose from 'mongoose'

const translatedSchema = new mongoose.Schema({
    pageNumber:{
        type:Number,
        required:true
    },
    content:{
        type:String,
        required:true
    }
})

const textSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    questionId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Question'
    },
    sources:[{
        pdfId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'PDF',
            required:true
        },
        pageNumber:{
            type:Number,
            required:true
        }
    }],
    translatedText:{
        type:[translatedSchema],
        default:[]
    },
    answerText:{
        type:String
    },
    sessionId:{
        type:String
    },
    title:{
        type:String
    }
},{
    timestamps:true
})

export const Text = mongoose.model('Text',textSchema)