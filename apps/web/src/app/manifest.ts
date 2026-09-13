import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Doguinho do Coruja",
    short_name: "Doguinho",
    description: "Fechamento diário da quantidade restante",
    start_url: "/",
    display: "standalone",
    background_color: "#E31C23",
    theme_color: "#E31C23",
    icons: [
      {
        src: "/marca-doguinho.png",
        type: "image/png",
        sizes: "1024x576",
      },
    ],
  };
}
