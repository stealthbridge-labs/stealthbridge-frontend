export const SITE_ORIGIN = "https://stealthbridge.vercel.app";
export const PUBLIC_ROUTES = ["/", "/business", "/send", "/platform"] as const;
export const absoluteUrl = (path: string): string => new URL(path, SITE_ORIGIN).toString();
