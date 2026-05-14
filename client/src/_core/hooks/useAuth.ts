import { trpc } from "@/lib/trpc";
import { isAuthRedirecting } from "@/lib/authGuard";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useRef } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } =
    options ?? {};
  const utils = trpc.useUtils();
  
  const effectiveRedirectPath = redirectPath ?? "/login";

  // Track if we've already detected a suspension error to prevent re-renders from re-fetching
  const suspendedRef = useRef(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    // Disable the query entirely if we're in the middle of an auth redirect
    // or if we've already detected that the role is suspended
    enabled: !isAuthRedirecting() && !suspendedRef.current,
  });

  // Detect suspension/unauthorized errors and mark as suspended to stop further queries
  useEffect(() => {
    if (meQuery.error instanceof TRPCClientError) {
      const code = meQuery.error.data?.code;
      const msg = meQuery.error.message || "";
      const isSuspended = msg.includes("ROLE_SUSPENDED") || msg.includes("موقوف") || msg.includes("مراجعة الإدارة");
      const isUnauthorized = code === "UNAUTHORIZED" || code === "FORBIDDEN";
      if (isSuspended || isUnauthorized) {
        suspendedRef.current = true;
      }
    }
  }, [meQuery.error]);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      // توجيه المستخدم إلى الصفحة الرئيسية بعد تسجيل الخروج
      window.location.href = "/";
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    // If we're redirecting due to auth failure, return logged-out state immediately
    if (isAuthRedirecting() || suspendedRef.current) {
      localStorage.removeItem("manus-runtime-user-info");
      return {
        user: null,
        loading: false,
        error: meQuery.error ?? null,
        isAuthenticated: false,
      };
    }

    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === effectiveRedirectPath) return;
    // Don't redirect if the circuit breaker already handled it
    if (isAuthRedirecting()) return;

    window.location.href = effectiveRedirectPath;
  }, [
    redirectOnUnauthenticated,
    effectiveRedirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
