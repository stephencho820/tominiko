import type { MetadataRoute } from "next";
import { getProducts } from "@/services/products";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPages = [
    "",
    "/shop",
    "/our-story",
    "/tasting-room",
    "/terms",
    "/privacy",
    "/shipping-returns",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/shop" || path === "" ? "weekly" as const : "monthly" as const,
    priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.6,
  }));

  try {
    const products = await getProducts({ activeOnly: true });
    return [
      ...staticPages,
      ...products.map((product) => ({
        url: `${base}/shop/${product.slug}`,
        lastModified: product.created_at ? new Date(product.created_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticPages;
  }
}
