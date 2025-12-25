import { ICart } from "@schemas/cart.scheme";

export const cartSummarizer = (cart: ICart | null | undefined) => {
    if (!cart) return undefined;
    const summary = cart?.sellerGroups?.flatMap((seller) => {
        const campaignItems = seller.campaignGroups?.flatMap((group) => group.items) || [];
        const combined = campaignItems.concat(seller.otherItems || []);

        const seen = new Set<string>();
        const unique = combined.filter((it: any) => {
            const candidateId = it.sellerListingId ?? (it.catalogId && it.catalogVariantId ? `${it.catalogId}-${it.catalogVariantId}` : null);
            const key = candidateId ?? JSON.stringify(it);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return unique;
    });

    return summary;
};
