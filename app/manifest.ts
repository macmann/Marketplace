import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Neighbour Myanmar",
    short_name: "Neighbour",
    description: "Buy. Sell. Give away. Find useful things near you.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f5",
    theme_color: "#224c3b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
