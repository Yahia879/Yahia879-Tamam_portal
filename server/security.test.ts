import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { securityMiddleware } from "./_core/security";
import type { Request, Response } from "express";

describe("Security and CORS Middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;
  const originalEnv = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ALLOWED_ORIGINS = "http://allowed.com,https://another-allowed.com";
    
    req = {
      path: "/api/test",
      method: "GET",
      headers: {},
      protocol: "http",
    };

    res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      sendStatus: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ALLOWED_ORIGINS = originalEnv;
  });

  it("appends global security headers to all responses", () => {
    securityMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
    expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(res.setHeader).toHaveBeenCalledWith("Referrer-Policy", "strict-origin-when-cross-origin");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining("default-src 'self'")
    );
    expect(next).toHaveBeenCalled();
  });

  it("allows requests from allowed origins and appends CORS headers", () => {
    req.headers = { origin: "http://allowed.com" };

    securityMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "http://allowed.com");
    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Headers", "Content-Type, Authorization");
    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Credentials", "true");
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows same-origin requests dynamically", () => {
    req.headers = { origin: "http://localhost:3000", host: "localhost:3000" };
    req.protocol = "http";

    securityMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "http://localhost:3000");
    expect(next).toHaveBeenCalled();
  });

  it("blocks requests from unapproved origins with a 403 Forbidden status", () => {
    req.headers = { origin: "http://hacker.com" };

    securityMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Forbidden: Origin not allowed by CORS policy",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("allows requests without Origin header (direct/same-site non-cross-origin)", () => {
    req.headers = {};

    securityMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalledWith("Access-Control-Allow-Origin", expect.any(String));
  });

  it("handles OPTIONS pre-flight requests from allowed origins by returning 200 immediately", () => {
    req.method = "OPTIONS";
    req.headers = { origin: "http://allowed.com" };

    securityMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "http://allowed.com");
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks OPTIONS pre-flight requests from unapproved origins", () => {
    req.method = "OPTIONS";
    req.headers = { origin: "http://hacker.com" };

    securityMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.sendStatus).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
