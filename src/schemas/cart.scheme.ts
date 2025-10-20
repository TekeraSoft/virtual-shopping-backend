import { z } from "zod";

export const CartItemSchema = z.object({
    productId: z.string().min(1, "Product ID is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    variationId: z.string().min(1, "Variation ID is required"),
    attributeId: z.string().min(1, "Attribute ID is required"),
});

export interface IAddToCartItem extends z.infer<typeof CartItemSchema> { }


export interface ICampaignLabel {
    id: string;
    campaignImage: string;
    campaignType: string;
    description: string;
    discountType: string;
    discountValue: number;
    endDate: string;
    isActive: boolean;
    name: string;
    startDate: string;
}

interface ISuggestion {
    campaignId: string;
    missingQuantity: number;
    potentialExtraSaving: number;
    suggestedAttributeId: string;
    suggestedUnitPrice: number;
    title: string;
}

export interface ISellerCampaign {
    sellerId: string;
    sellerName: string;
    appliedCampaign: {
        id: string;
        name: string;
        description: string;
        campaignType: string; // Sabit değer gibi görünüyor
        discountValue: number;
        discountType: string;
        startDate: string; // ISO tarih formatı
        endDate: string;
        campaignImage: string;
        isActive: boolean;
    };
    suggestions: ISuggestion[];
    totalDiscount: number;
};

export interface ICart {
    cartItems: ICartItem[];
    sellerCampaigns: ISellerCampaign[] | null;
    id: string;
    itemCount: number;
    totalPrice: number;
    shippingPrice: number;
};



export interface ISeller {
    id: string;
    name: string;
    slug: string;
    image: string;
}

interface ProductAttribute {
    key: string;
    value: string;
}

export interface ICartItem {
    attributeId: string;
    attributes: ProductAttribute[]; // Attribute tipini aşağıda ayrıca tanımlayabilirsin
    availableCampaigns: ICampaignLabel[] | null;
    brandName: string;
    color: string;
    discountAmount: number;
    finalPrice: number;
    image: string;
    maxPurchaseStock: number;
    modelCode: string;
    name: string;
    price: number;
    productId: string;
    productSlug: string;
    quantity: number;
    selectedCampaignId: string | null;
    seller: ISeller;
    slugId: string;
    variationId: string;
}

