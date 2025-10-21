import mongoose, { Schema, Document } from 'mongoose';

export interface IInvitation extends Document {
    _id: string;
    userId: string;
    friendId: string;
    createdAt: Date;
    updatedAt: Date;
}

const invitationSchema: Schema = new Schema({
    userId: {
        type: String,
        required: true
    },
    friendId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Compound index - bir kişi aynı kişiyi birden fazla kez davet edemesin
invitationSchema.index({ userId: 1, friendId: 1 }, { unique: true });

// İndexler sorgu performansını artırır (duplicate uyarısını önlemek için tek tek tanımlıyoruz)
invitationSchema.index({ userId: 1 });
invitationSchema.index({ friendId: 1 });

export const Invitation = mongoose.model<IInvitation>('Invitation', invitationSchema);