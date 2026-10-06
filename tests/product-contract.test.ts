import assert from "node:assert/strict";
import { canonicalGrind, canonicalSize, PRODUCT_GRINDS, PRODUCT_SIZES, validateCanonicalVariants, variantKey, variantStockTotal } from "../lib/product-contract";
import { synchronizeProductPricing } from "../lib/product-admin";

assert.deepEqual(PRODUCT_SIZES, ["150g", "400g"]);
assert.deepEqual(PRODUCT_GRINDS, ["Whole Bean", "Filter", "Espresso"]);
assert.equal(canonicalSize(" 400 G "), "400g");
assert.equal(canonicalSize("1kg"), null);
assert.equal(canonicalGrind("Pour Over"), "Filter");
assert.equal(canonicalGrind("Filter"), "Filter");
assert.equal(canonicalGrind("Moka Pot"), null);

const variants = [
  { id: "150", size: "150g", price: 19_000, salePrice: 13_000, stock: 4, available: true },
  { id: "400", size: "400g", price: 44_000, salePrice: 29_000, stock: 2, available: true },
];
assert.equal(validateCanonicalVariants(variants), null);
assert.equal(variantStockTotal(variants), 6);
assert.match(validateCanonicalVariants([...variants, { ...variants[0], id: "duplicate" }]) ?? "", /Duplicate option/);
assert.match(validateCanonicalVariants([{ ...variants[0], size: "1kg" }]) ?? "", /supported size/);
assert.match(validateCanonicalVariants([{ ...variants[0], stock: -1 }]) ?? "", /valid price/);
for (const grind of PRODUCT_GRINDS) assert.equal(canonicalGrind(grind), grind);
assert.equal(variantKey({ size: "150g" }), "150g");
const payload: Record<string, unknown> = { variants: variants.map((variant) => ({ ...variant })) };
synchronizeProductPricing(payload);
assert.equal(payload.stock_quantity, 6);
assert.equal(payload.price_150g, 13_000);
assert.equal(payload.price_400g, 29_000);
console.log("product contract tests passed");
