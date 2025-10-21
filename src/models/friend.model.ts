import mongoose, { Schema, Document } from 'mongoose';

export interface IFriend extends Document {
    _id: string;
    userId: string; // owner of the friend list
    friendId: string; // friend's userId
    friendEmail?: string;
    friendName?: string;
    createdAt: Date;
    updatedAt: Date;
}

const friendSchema: Schema = new Schema({
    userId: {
        type: String,
        required: true
    },
    friendId: {
        type: String,
        required: true
    },
    friendEmail: {
        type: String,
        required: false
    },
    friendName: {
        type: String,
        required: false
    }
}, {
    timestamps: true
});

// Ensure a user cannot add the same friend multiple times
friendSchema.index({ userId: 1, friendId: 1 }, { unique: true });
friendSchema.index({ userId: 1 });
friendSchema.index({ friendId: 1 });

export const Friend = mongoose.model<IFriend>('Friend', friendSchema);
