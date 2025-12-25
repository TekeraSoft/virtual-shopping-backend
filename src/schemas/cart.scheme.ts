import { z } from "zod";

export const AddToCartItemScheme = z.object({
    sellerListingId: z.string().min(1, "Product ID is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
});

export interface IAddToCartItem extends z.infer<typeof AddToCartItemScheme> { }

export interface IAvailableCampaign {
    campaignId: string;
    campaignName: string;
    campaignType: string;
    discountValue: number;
    label: string;
}
export interface IAttribute {
    key: string;
    value: string;
}


export interface ISellerSuggestion {
    message: string;
    campaignId: string;
    requiredAmount: number;
    benefitDescription: string;
}

export interface ICartItem {
    sellerListingId: string;
    catalogId: string;
    catalogVariantId: string;
    productName: string;
    productSlug: string;
    brandName: string;
    variantCode: string;
    variantColor: string;
    unitPrice: number;
    discountedUnitPrice: number | null;
    sellerId: string;
    sellerName: string;
    sellerSlug: string;
    sellerLogo?: string;
    image: string | null;
    quantity: number;
    maxPurchaseStock: number;
    availableStock: number;
    attributes: IAttribute[];
    selectedCampaignId: null | string;
    availableCampaigns: IAvailableCampaign[];
    discountAmount: number;
    finalPrice: number;
    lineTotal: number;
    itemSuggestion: null | {
        benefitDescription: string;
        campaignId: string;
        message: string;
        requiredAmount: number;
    };
    hasDiscount: boolean;
    discountPercentage: number | null;
}

export interface IShippingOption {
    id: string;
    name: string;
    price: number;
    minDeliveryDay: number;
    maxDeliveryDay: number;
    trackingUrl: string | null;
    isDefault: boolean;
}

export interface ISellerGroup {
    sellerId: string;
    sellerName: string;
    sellerSlug: string;
    sellerImage: string;
    subtotal: number;
    appliedCampaign: null | {
        campaignId: string;
        campaignName: string;
        discountAmount: number;
        missingForFreeShipping: null | number;
        sellerId: string;
    };
    selectedShippingId: null | string;
    suggestion: ISellerSuggestion | null;
    campaignGroups: ICampaignGroup[];
    otherItems: ICartItem[];
    shippingOptions: IShippingOption[];
}

export interface ICampaignGroup {
    campaignId: string;
    campaignName: string;
    items: ICartItem[];
}

export interface ICart {
    id: string;
    totalPrice: number;
    totalDiscountedPrice: number;
    totalDiscount: number;
    itemCount: number;
    shippingPrice: number;
    grandTotal: number;
    sellerGroups: ISellerGroup[];
    sellerCampaigns: any[]; // yapı örneğinde boş array. Eğer yapısı biliniyorsa detaylandırılabilir.
    sellerShipping: any[];  // yapı örneğinde boş array. Eğer yapısı biliniyorsa detaylandırılabilir.
}

