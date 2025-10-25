import { z } from "zod";

export const AddToCartItemScheme = z.object({
    productId: z.string().min(1, "Product ID is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    variationId: z.string().min(1, "Variation ID is required"),
    attributeId: z.string().min(1, "Attribute ID is required"),
});

export interface IAddToCartItem extends z.infer<typeof AddToCartItemScheme> { }


export interface ICart {
    cartId: string;
    totals: ITotals;
    sellers: ISeller[];
}

export interface ITotals {
    baseTotal: number;
    discountTotal: number;
    shipping: number | null;
    grandTotal: number;
}

export interface ISeller {
    sellerId: string;
    sellerName: string;
    sellerImage: string;
    totals: ITotals;
    campaignBuckets: ICampaignBucket[];
    otherItems: ICartItem[];
}

export interface ICampaignBucket {
    campaign: ICampaign;
    state: "APPLIED" | "PARTIAL" | "NOT_APPLIED";
    groupKey: string | null;
    thresholdQty: number | null;
    currentQty: number | null;
    missingQty: number | null;
    freeUnits: number | null;
    totalDiscount: number;
    items: ICartItem[];
    suggestion: ICampaignSuggestion;
}

export interface ICampaignSuggestion {
    missingQuantity: number;
    potentialExtraSaving: number;
    suggestedAttributeId: string;
    suggestedUnitPrice: number;
    title: string;
}

export interface ICampaign {
    id: string;
    name: string;
    description: string;
    campaignType: "DISCOUNT_OR_PERCENT" | "BUYXGETY" | string;
    discountValue: number;
    discountType: "PERCENT" | "NO_VALUE" | string;
    startDate: string; // ISO format
    endDate: string;   // ISO format
    campaignImage: string;
    isActive: boolean;
}

export interface ICartItem {
    attributeId: string;
    productId: string;
    variationId: string;
    name: string;
    brandName: string;
    productSlug: string;
    slugId: string;
    image: string;
    color: string;
    qty: number;
    baseUnitPrice: number;
    baseLineTotal: number;
    finalUnitPrice: number;
    finalLineTotal: number;
    discount: number;
    freeUnits: number | null;
    attributes: ProductAttribute[];
}

export interface ProductAttribute {
    key: string;
    value: string;
}