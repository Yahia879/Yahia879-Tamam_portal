import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { securityMiddleware } from "./_core/security";
import { sdk } from "./_core/sdk";
import type { Request, Response } from "express";

// Mock SDK Server authentication
vi.mock("./_core/sdk", () => {
  return {
    sdk: {
      authenticateRequest: vi.fn(),
    },
  };
});

describe("Security and CORS Middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;
  const originalEnv = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ALLOWED_ORIGINS = "http://allowed.com,https://another-allowed.com";
    vi.clearAllMocks();

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
      redirect: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ALLOWED_ORIGINS = originalEnv;
  });

  it("appends global security headers to all responses", async () => {
    await securityMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
    expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(res.setHeader).toHaveBeenCalledWith("Referrer-Policy", "strict-origin-when-cross-origin");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining("default-src 'self'")
    );
    expect(next).toHaveBeenCalled();
  });

  it("allows requests from allowed origins and appends CORS headers", async () => {
    req.headers = { origin: "http://allowed.com" };

    await securityMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "http://allowed.com");
    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Headers", "Content-Type, Authorization");
    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Credentials", "true");
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows same-origin requests dynamically", async () => {
    req.headers = { origin: "http://localhost:3000", host: "localhost:3000" };
    req.protocol = "http";

    await securityMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "http://localhost:3000");
    expect(next).toHaveBeenCalled();
  });

  it("blocks requests from unapproved origins with a 403 Forbidden status", async () => {
    req.headers = { origin: "http://hacker.com" };

    await securityMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Forbidden: Origin not allowed by CORS policy",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("allows requests without Origin header (direct/same-site non-cross-origin)", async () => {
    req.headers = {};

    await securityMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalledWith("Access-Control-Allow-Origin", expect.any(String));
  });

  it("handles OPTIONS pre-flight requests from allowed origins by returning 200 immediately", async () => {
    req.method = "OPTIONS";
    req.headers = { origin: "http://allowed.com" };

    await securityMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "http://allowed.com");
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks OPTIONS pre-flight requests from unapproved origins", async () => {
    req.method = "OPTIONS";
    req.headers = { origin: "http://hacker.com" };

    await securityMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.sendStatus).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  // Protected Route Tests
  it("redirects to /login if a protected page is requested without a valid session", async () => {
    req.path = "/suppliers";
    req.method = "GET";
    vi.mocked(sdk.authenticateRequest).mockRejectedValue(new Error("Invalid session"));

    await securityMiddleware(req as Request, res as Response, next);

    expect(sdk.authenticateRequest).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("/login");
    expect(next).not.toHaveBeenCalled();
  });

  it("allows access to a protected page if a valid session is present", async () => {
    req.path = "/suppliers/123";
    req.method = "GET";
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ id: 1, openId: "user-1" } as any);

    await securityMiddleware(req as Request, res as Response, next);

    expect(sdk.authenticateRequest).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("does not restrict public page requests like /login or landing page /", async () => {
    req.path = "/login";
    req.method = "GET";

    await securityMiddleware(req as Request, res as Response, next);

    expect(sdk.authenticateRequest).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
