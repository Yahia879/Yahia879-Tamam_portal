import { Request, Response, NextFunction } from "express";
import { sdk } from "./sdk";

const protectedPaths = [
  "/suppliers",
  "/dashboard",
  "/mosques",
  "/requests",
  "/field-visits",
  "/staff",
  "/users",
  "/roles",
  "/job-positions",
  "/requester-approvals",
  "/projects",
  "/project-management",
  "/partners",
  "/branding",
  "/settings",
  "/reports",
  "/pending-reports"
];

/**
 * Parses and returns the list of allowed origins defined in the environment.
 */
export function getAllowedOrigins(): string[] {
  const originsEnv = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS;
  if (originsEnv) {
    return originsEnv
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  // Default fallback for development/local environments
  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
}

/**
 * Utility to check if a given origin is same-origin with the request.
 */
function isSameOrigin(req: Request, origin: string): boolean {
  try {
    const host = req.headers.host; // e.g., "localhost:3000"
    if (!host) return false;

    // Support reverse proxies if x-forwarded-proto is present
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
    const requestOrigin = `${protocol}://${host}`;

    return origin.toLowerCase() === requestOrigin.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Global middleware for CORS policy validation and Security Headers injection.
 */
export async function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Inject Global Security Hardening Headers to ALL responses
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Dynamic Content Security Policy (CSP)
  const allowedOrigins = getAllowedOrigins();
  const analyticsEndpoint = process.env.VITE_ANALYTICS_ENDPOINT || "";
  const oauthServerUrl = process.env.OAUTH_SERVER_URL || "";

  const additionalOriginsSet = new Set<string>();

  // Extract origins from VITE_ANALYTICS_ENDPOINT
  if (analyticsEndpoint && analyticsEndpoint.startsWith("http")) {
    try {
      const url = new URL(analyticsEndpoint);
      additionalOriginsSet.add(url.origin);
    } catch {
      additionalOriginsSet.add(analyticsEndpoint);
    }
  }

  // Extract origins from OAUTH_SERVER_URL
  if (oauthServerUrl && oauthServerUrl.startsWith("http")) {
    try {
      const url = new URL(oauthServerUrl);
      additionalOriginsSet.add(url.origin);
    } catch {
      additionalOriginsSet.add(oauthServerUrl);
    }
  }

  // Also include the allowed origins in CSP
  allowedOrigins.forEach((origin) => {
    additionalOriginsSet.add(origin);
  });

  const additionalOriginsStr = Array.from(additionalOriginsSet).join(" ");

  // Build Content Security Policy directives
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${additionalOriginsStr}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.sharepoint.com https://*.sharepoint.cn https://*.1drv.com https://*.live.com https://*.microsoft.com https://*.microsoftonline.com https://*.office.com https://*.office365.com",
    `connect-src 'self' ws: wss: ${additionalOriginsStr}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ];

  res.setHeader("Content-Security-Policy", cspDirectives.join("; "));

  // 2. Programmatic CORS Validation Logic for API routes and assets (/api/*, /uploads/*)
  const isProtectedPath = req.path.startsWith("/api/") || req.path.startsWith("/uploads/");

  if (isProtectedPath) {
    const origin = req.headers.origin;

    if (origin) {
      const isAllowed = allowedOrigins.includes(origin) || isSameOrigin(req, origin);

      if (isAllowed) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", "true");
      } else {
        // Log blocked cross-origin request
        console.warn(`[CORS Blocked] Request to ${req.path} from unapproved origin: ${origin}`);
        res.status(403).json({
          error: "Forbidden: Origin not allowed by CORS policy",
          origin,
        });
        return;
      }
    }

    // 3. Gracefully handle OPTIONS pre-flight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
  }

  // 4. Session-Based Page Route Protection (Redirect unauthenticated to /login)
  const isPageRequest = req.method === "GET" && 
                        !req.path.startsWith("/api/") && 
                        !req.path.startsWith("/uploads/") && 
                        !req.path.includes(".");

  if (isPageRequest) {
    const isProtected = protectedPaths.some(
      (p) => req.path === p || req.path.startsWith(p + "/")
    );

    if (isProtected) {
      try {
        const user = await sdk.authenticateRequest(req);
        if (!user) {
          console.warn(`[Route Protection] No user session found for ${req.path}. Redirecting to /login`);
          return res.redirect("/login");
        }
      } catch (error) {
        console.warn(`[Route Protection] Unauthenticated direct access to ${req.path}. Redirecting to /login.`);
        return res.redirect("/login");
      }
    }
  }

  next();
}
