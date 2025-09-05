import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    questionText: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    answer: {
        type: String,
        trim: true
    },
    sources: [{
        pdfId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PDF'
        },
        pageNumber: {
            type: Number
        }
    }]
}, {
    timestamps: true
});

// Add compound indexes for efficient querying
questionSchema.index({ userId: 1, sessionId: 1 });
questionSchema.index({ sessionId: 1, createdAt: 1 });

export const Question = mongoose.model('Question', questionSchema);