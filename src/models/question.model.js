import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    sessionId:{
        type:String
    },
    questionText:{
        type:String
    },
    title:{
        type:String
    }
},{
    timestamps:true
})

export const Question = mongoose.model('Question',questionSchema)