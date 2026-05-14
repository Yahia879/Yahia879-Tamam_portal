/**
 * Auth Guard Circuit Breaker
 * 
 * Module-level flag that prevents infinite 401 redirect loops.
 * When a suspended-role 401 is detected, this flag is set to true,
 * which stops all further auth.me queries and redirect attempts.
 * 
 * Separated into its own module to avoid circular imports between
 * main.tsx and useAuth.ts.
 */

let _isRedirectingForAuth = false;

/** Check if an auth redirect is currently in progress */
export function isAuthRedirecting(): boolean {
  return _isRedirectingForAuth;
}

/** Activate the circuit breaker — stops all further auth queries */
export function setAuthRedirecting(value: boolean): void {
  _isRedirectingForAuth = value;
}

// ---- Suspension message (sessionStorage) ----
// Used to pass the suspension warning to the landing page after redirect,
// avoiding URL params entirely.

const SUSPENSION_KEY = "auth_suspension_message";

/** Store a suspension message to be shown after redirect */
export function setSuspensionMessage(message: string): void {
  try { sessionStorage.setItem(SUSPENSION_KEY, message); } catch {}
}

/** Read and clear the suspension message (one-time consumption) */
export function consumeSuspensionMessage(): string | null {
  try {
    const msg = sessionStorage.getItem(SUSPENSION_KEY);
    if (msg) sessionStorage.removeItem(SUSPENSION_KEY);
    return msg;
  } catch {
    return null;
  }
}
