import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZaySine by Flash Tech",
    short_name: "ZaySine",
    description: "Buy. Sell. Give away. Find useful things near you.",
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8ed",
    theme_color: "#174e50",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
