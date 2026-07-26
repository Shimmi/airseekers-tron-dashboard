import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Airseekers Tron Dashboard",
        short_name: "Tron",
        description: "Real-time telemetry dashboard for Airseekers Tron mower",
        theme_color: "#0f1117",
        background_color: "#0f1117",
        display: "standalone",
        orientation: "any",
        icons: [
          { src: "/tron.png", sizes: "1024x1024", type: "image/png" },
          { src: "/tron.png", sizes: "512x512", type: "image/png" },
          {
            src: "/tron.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
