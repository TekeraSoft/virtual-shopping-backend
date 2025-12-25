import mongoose, { Schema } from 'mongoose';
import { ICart } from '@schemas/cart.scheme';

const AttributeSchema = new Schema({
    key: { type: String, required: false },
    value: { type: String, required: false },
}, { _id: false });

const AvailableCampaignSchema = new Schema({
    campaignId: { type: String, required: false },
    campaignName: { type: String, required: false },
    campaignType: { type: String, required: false },
    discountValue: { type: Number, required: false },
    label: { type: String, required: false },
}, { _id: false });

const ItemSuggestionSchema = new Schema({
    benefitDescription: { type: String, required: false },
    campaignId: { type: String, required: false },
    message: { type: String, required: false },
    requiredAmount: { type: Number, required: false },
}, { _id: false });

const CartItemSchema = new Schema({
    sellerListingId: { type: String, required: true },
    catalogId: { type: String, required: false },
    catalogVariantId: { type: String, required: false },
    productName: { type: String, required: false },
    productSlug: { type: String, required: false },
    brandName: { type: String, required: false },
    variantCode: { type: String, required: false },
    variantColor: { type: String, required: false },
    unitPrice: { type: Number, required: false },
    discountedUnitPrice: { type: Number, default: null },
    sellerId: { type: String, required: false },
    sellerName: { type: String, required: false },
    sellerSlug: { type: String, required: false },
    sellerLogo: { type: String, required: false },
    image: { type: String, default: null },
    quantity: { type: Number, required: false },
    maxPurchaseStock: { type: Number, required: false },
    availableStock: { type: Number, required: false },
    attributes: [AttributeSchema],
    selectedCampaignId: { type: String, default: null },
    availableCampaigns: [AvailableCampaignSchema],
    discountAmount: { type: Number, required: false },
    finalPrice: { type: Number, required: false },
    lineTotal: { type: Number, required: false },
    itemSuggestion: { type: ItemSuggestionSchema, default: null },
    hasDiscount: { type: Boolean, required: false },
    discountPercentage: { type: Number, default: null },
}, { _id: false });

const ShippingOptionSchema = new Schema({
    id: { type: String, required: false },
    name: { type: String, required: false },
    price: { type: Number, required: false },
    minDeliveryDay: { type: Number, required: false },
    maxDeliveryDay: { type: Number, required: false },
    trackingUrl: { type: String, default: null },
    isDefault: { type: Boolean, required: false },
}, { _id: false });

const SellerSuggestionSchema = new Schema({
    message: { type: String, required: false },
    campaignId: { type: String, required: false },
    requiredAmount: { type: Number, required: false },
    benefitDescription: { type: String, required: false },
}, { _id: false });

const AppliedCampaignSchema = new Schema({
    campaignId: { type: String, required: false },
    campaignName: { type: String, required: false },
    discountAmount: { type: Number, required: false },
    missingForFreeShipping: { type: Number, default: null },
    sellerId: { type: String, required: false },
}, { _id: false });

const CampaignGroupSchema = new Schema({
    campaignId: { type: String, required: false },
    campaignName: { type: String, required: false },
    items: [CartItemSchema],
}, { _id: false });

const SellerGroupSchema = new Schema({
    sellerId: { type: String, required: false },
    sellerName: { type: String, required: false },
    sellerSlug: { type: String, required: false },
    sellerImage: { type: String, required: false },
    subtotal: { type: Number, required: false },
    appliedCampaign: { type: AppliedCampaignSchema, default: null },
    selectedShippingId: { type: String, default: null },
    suggestion: { type: SellerSuggestionSchema, default: null },
    campaignGroups: [CampaignGroupSchema],
    otherItems: [CartItemSchema],
    shippingOptions: [ShippingOptionSchema],
}, { _id: false });

const WishlistSchema = new Schema<ICart>({
    id: { type: String, required: true, unique: true },
    totalPrice: { type: Number, required: false },
    totalDiscountedPrice: { type: Number, required: false },
    totalDiscount: { type: Number, required: false },
    itemCount: { type: Number, required: false },
    shippingPrice: { type: Number, required: false },
    grandTotal: { type: Number, required: false },
    sellerGroups: [SellerGroupSchema],
    sellerCampaigns: { type: Schema.Types.Mixed, default: [] },
    sellerShipping: { type: Schema.Types.Mixed, default: [] },
});

const WishlistModel = mongoose.model<ICart>('Wishlist', WishlistSchema);

export default WishlistModel;
