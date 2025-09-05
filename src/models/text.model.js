import mongoose from 'mongoose';

const translatedSchema = new mongoose.Schema({
    pageNumber: {
        type: Number,
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    }
});

const textSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    sources: [{
        pdfId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PDF',
            required: true
        },
        pageNumber: {
            type: Number,
            required: true
        }
    }],
    translatedText: {
        type: [translatedSchema],
        default: []
    },
    answerText: {
        type: String,
        required: true,
        trim: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true // allows faster queries per session
    },
    title: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

// Optional: unique per question per session
textSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

export const Text = mongoose.model('Text', textSchema);
