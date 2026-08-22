import crypto from "node:crypto";

if (!(crypto as any).hash) {
  (crypto as any).hash = function (
    algorithm: string,
    data: crypto.BinaryLike,
    outputEncoding?: crypto.BinaryToTextEncoding
  ) {
    const hash = crypto.createHash(algorithm).update(data);
    return outputEncoding ? hash.digest(outputEncoding) : hash.digest();
  };
}

try {
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", {
      value: crypto,
      configurable: true,
      writable: true,
    });
  }
} catch (e) {
  // Ignored if crypto is already defined with getter in Node.js
}

import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

const __dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(__dirname),
  root: path.resolve(__dirname, "client"),
  publicDir: path.resolve(__dirname, "client", "public"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
