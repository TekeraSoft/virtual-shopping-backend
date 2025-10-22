import mongoose, { Schema } from 'mongoose';
import { ICart } from 'src/schemas/cart.scheme';

// Define the Wishlist schema
const WishlistSchema = new Schema({
    cartItems: [
        {
            attributeId: { type: String, required: true },
            attributes: [
                {
                    key: { type: String, required: true },
                    value: { type: String, required: true },
                },
            ],
            availableCampaigns: [
                {
                    id: { type: String, required: true },
                    campaignImage: { type: String, required: true },
                    campaignType: { type: String, required: true },
                    description: { type: String, required: true },
                    discountType: { type: String, required: true },
                    discountValue: { type: Number, required: true },
                    endDate: { type: String, required: true },
                    isActive: { type: Boolean, required: true },
                    name: { type: String, required: true },
                    startDate: { type: String, required: true },
                },
            ],
            brandName: { type: String, required: true },
            color: { type: String, required: true },
            discountAmount: { type: Number, required: true },
            finalPrice: { type: Number, required: true },
            image: { type: String, required: true },
            maxPurchaseStock: { type: Number, required: true },
            modelCode: { type: String, required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            productId: { type: String, required: true },
            productSlug: { type: String, required: true },
            quantity: { type: Number, required: true },
            selectedCampaignId: { type: String },
            seller: {
                id: { type: String, required: true },
                name: { type: String, required: true },
                slug: { type: String, required: true },
                image: { type: String, required: true },
            },
            slugId: { type: String, required: true },
            variationId: { type: String, required: true },
        },
    ],
    sellerCampaigns: [
        {
            sellerId: { type: String, required: true },
            sellerName: { type: String, required: true },
            appliedCampaign: {
                type: new Schema(
                    {
                        id: { type: String, required: true },
                        name: { type: String, required: true },
                        description: { type: String, required: true },
                        campaignType: { type: String, required: true },
                        discountValue: { type: Number, required: true },
                        discountType: { type: String, required: true },
                        startDate: { type: String, required: true },
                        endDate: { type: String, required: true },
                        campaignImage: { type: String, required: true },
                        isActive: { type: Boolean, required: true },
                    },
                    { _id: false }
                ),
                default: null,
            },
            suggestions: {
                type: [
                    {
                        campaignId: { type: String, required: true },
                        missingQuantity: { type: Number, required: true },
                        potentialExtraSaving: { type: Number, required: true },
                        suggestedAttributeId: { type: String, required: true },
                        suggestedUnitPrice: { type: Number, required: true },
                        title: { type: String, required: true },
                    },
                ],
                default: null,
            },
            totalDiscount: { type: Number, required: true },
        },
    ],
    id: { type: String, required: true, unique: true },
    itemCount: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
});

// Create the Wishlist model
const WishlistModel = mongoose.model<ICart>('Wishlist', WishlistSchema);

export default WishlistModel;