import { ICart } from "@schemas/cart.scheme";

export const cartSummarizer = (cart: ICart | null | undefined) => {
    if (!cart) return undefined;
    const summary = cart?.sellers?.flatMap((seller) => {
        // Tüm kampanya öğelerini topla
        const bucketItems = seller.campaignBuckets.flatMap((bucket) => bucket.items);
        // Kampanya öğeleri ile otherItems'ı birleştir (otherItems her bucket için tekrar eklenmesin)
        const combined = bucketItems.concat(seller.otherItems || []);

        // attributeId veya productId üzerinden benzersizleştir
        const seen = new Set<string | number>();
        const unique = combined.filter((it: any) => {
            const id = it.attributeId ?? it.productId;
            if (id == null) {
                // Güvenlik için fallback: objenin kendisini stringleyip kullan
                const key = JSON.stringify(it);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        return unique;
    });

    return summary;
};