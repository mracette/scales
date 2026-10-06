import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/scales/",
  plugins: [react()],
  server: { port: 4747, strictPort: true },
  preview: { port: 4748, strictPort: true },
});
