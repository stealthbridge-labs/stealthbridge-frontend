import type { MetadataRoute } from "next";
import { absoluteUrl, PUBLIC_ROUTES } from "./site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
