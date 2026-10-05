import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NXT Speaker",
    short_name: "NXT Speaker",
    description: "Book transformative speakers directly — no agencies, no gatekeepers.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#031E57",
    icons: [
      { src: "/logoMark_navy.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
