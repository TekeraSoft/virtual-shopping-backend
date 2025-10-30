import mongoose, { Schema } from 'mongoose';
import { ICart } from 'src/schemas/cart.scheme';

// Define Product Attribute schema
const ProductAttributeSchema = new Schema({
    key: { type: String, required: false },
    value: { type: String, required: false },
}, { _id: false });

// Define Campaign schema
const CampaignSchema = new Schema({
    id: { type: String, required: false },
    name: { type: String, required: false },
    description: { type: String, required: false },
    campaignType: { type: String, required: false },
    discountValue: { type: Number, required: false },
    discountType: { type: String, required: false },
    startDate: { type: String, required: false },
    endDate: { type: String, required: false },
    campaignImage: { type: String, required: false },
    isActive: { type: Boolean, required: false },
}, { _id: false });

// Define Campaign Suggestion schema
const CampaignSuggestionSchema = new Schema({
    missingQuantity: { type: Number, required: false },
    potentialExtraSaving: { type: Number, required: false },
    suggestedAttributeId: { type: String, required: false },
    suggestedUnitPrice: { type: Number, required: false },
    title: { type: String, required: false },
}, { _id: false });

// Define Cart Item schema
const CartItemSchema = new Schema({
    attributeId: { type: String, required: false },
    productId: { type: String, required: false },
    variationId: { type: String, required: false },
    name: { type: String, required: false },
    brandName: { type: String, required: false },
    productSlug: { type: String, required: false },
    slugId: { type: String, required: false },
    image: { type: String, required: false },
    color: { type: String, required: false },
    qty: { type: Number, required: false },
    baseUnitPrice: { type: Number, required: false },
    baseLineTotal: { type: Number, required: false },
    finalUnitPrice: { type: Number, required: false },
    finalLineTotal: { type: Number, required: false },
    discount: { type: Number, required: false },
    freeUnits: { type: Number, default: null },
    attributes: [ProductAttributeSchema],
}, { _id: false });

// Define Campaign Bucket schema
const CampaignBucketSchema = new Schema({
    campaign: { type: CampaignSchema, required: false },
    state: {
        type: String,
        enum: ["APPLIED", "PARTIAL", "NOT_APPLIED"],
        required: false
    },
    groupKey: { type: String, default: null },
    thresholdQty: { type: Number, default: null },
    currentQty: { type: Number, default: null },
    missingQty: { type: Number, default: null },
    freeUnits: { type: Number, default: null },
    totalDiscount: { type: Number, required: false },
    items: [CartItemSchema],
    suggestion: { type: CampaignSuggestionSchema, required: false },
}, { _id: false });

// Define Totals schema
const TotalsSchema = new Schema({
    baseTotal: { type: Number, required: false },
    discountTotal: { type: Number, required: false },
    shipping: { type: Number, default: null },
    grandTotal: { type: Number, required: false },
}, { _id: false });

// Define Seller schema
const SellerSchema = new Schema({
    sellerId: { type: String, required: false },
    sellerName: { type: String, required: false },
    sellerImage: { type: String, required: false },
    totals: { type: TotalsSchema, required: false },
    campaignBuckets: [CampaignBucketSchema],
    otherItems: [CartItemSchema],
}, { _id: false });

// Define the Wishlist schema according to ICart interface
const WishlistSchema = new Schema({
    cartId: { type: String, required: false, unique: true },
    totals: { type: TotalsSchema, required: false },
    sellers: [SellerSchema],
}, { _id: false });

// Create the Wishlist model
const WishlistModel = mongoose.model<ICart>('Wishlist', WishlistSchema);

export default WishlistModel;