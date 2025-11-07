import mongoose, { Schema, Document } from 'mongoose';

export interface IInvitation extends Document {
    _id: string;
    invitedId: string;
    inviterId: string;
    createdAt: Date;
    updatedAt: Date;
}

const invitationSchema: Schema = new Schema({
    invitedId: {
        type: String,
        required: true
    },
    inviterId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Compound index - bir kişi aynı kişiyi birden fazla kez davet edemesin
invitationSchema.index({ inviterId: 1, invitedId: 1 }, { unique: true });

// İndexler sorgu performansını artırır (duplicate uyarısını önlemek için tek tek tanımlıyoruz)
invitationSchema.index({ inviterId: 1 });
invitationSchema.index({ invitedId: 1 });

export const Invitation = mongoose.model<IInvitation>('Invitation', invitationSchema);