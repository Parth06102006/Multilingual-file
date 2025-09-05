import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema({
    pageNumber: {
        type: Number,
        required: true
    },
    content: {
        type: String,
        required: true
    }
});

const pdfSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId: {
        type: String,
        default: '', // Make optional - empty string for general library PDFs
        index: true
    },
    fileName: {
        type: String,
        trim: true,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    language: {
        type: String,
        default: 'en'
    },
    text: {
        type: [pageSchema],
        default: []
    },
    totalPages: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Add compound index for efficient querying
pdfSchema.index({ userId: 1, sessionId: 1 });
pdfSchema.index({ userId: 1, createdAt: -1 });

export const PDF = mongoose.model('PDF', pdfSchema);