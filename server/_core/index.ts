import "dotenv/config";
import express from "express";

// Ensure NODE_ENV is set, default to development unless running from dist
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = import.meta.url.includes("/dist/")
    ? "production"
    : "development";
}

import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import uploadRouter from "../upload";
import pdfRouter from "../pdf";
import { securityMiddleware } from "./security";
import { isOneDriveConfigured, getAccessToken } from "../storage";
import fs from "fs";
import axios from "axios";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Apply security headers & CORS policy validation globally
  app.use(securityMiddleware);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Simple in-memory cache for OneDrive download URLs (valid for 30 minutes)
  const downloadUrlCache = new Map<string, { url: string; expiresAt: number }>();

  // Proxy files from OneDrive if configured, otherwise fallback to local files
  app.get("/uploads/:file(*)", async (req, res, next) => {
    const fileKey = req.params.file;
    
    // If the file exists locally, serve it directly from local storage
    const localFilePath = path.join(process.cwd(), "uploads", fileKey);
    if (fs.existsSync(localFilePath)) {
      next();
      return;
    }

    if (isOneDriveConfigured()) {
      try {
        // 1. Check in-memory cache first (cached for 50 minutes)
        const cached = downloadUrlCache.get(fileKey);
        if (cached && Date.now() < cached.expiresAt) {
          res.redirect(cached.url);
          return;
        }

        const token = await getAccessToken();
        const upn = process.env.ONEDRIVE_USER_PRINCIPAL_NAME;
        const metadataUrl = `https://graph.microsoft.com/v1.0/users/${upn}/drive/root:/${fileKey}`;
        
        // Use Axios to retrieve metadata to bypass native fetch/undici connection timeout issues
        const metadataResponse = await axios.get(metadataUrl, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          timeout: 10000, // 10 seconds timeout
        });

        if (metadataResponse.status === 200) {
          const downloadUrl = metadataResponse.data["@microsoft.graph.downloadUrl"];
          
          if (downloadUrl) {
            // Cache the URL for 50 minutes (Microsoft signatures expire after 60 minutes)
            downloadUrlCache.set(fileKey, {
              url: downloadUrl,
              expiresAt: Date.now() + 50 * 60 * 1000
            });

            res.redirect(downloadUrl);
            return;
          }
        }
      } catch (error: any) {
        console.error(`Error redirecting file from OneDrive for "${fileKey}":`, error.message);
      }
    }
    next();
  });

  // Serve uploads statically
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Upload endpoint
  app.use("/api", uploadRouter);
  // PDF export endpoint
  app.use("/api", pdfRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
