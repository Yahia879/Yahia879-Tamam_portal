import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
// getLoginUrl removed — redirects now use plain paths
import "./index.css";

import { isAuthRedirecting, setAuthRedirecting, setSuspensionMessage } from "@/lib/authGuard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Never retry on 401/403 — prevents hammering the server when a role is suspended
        if (error instanceof TRPCClientError) {
          const code = error.data?.code;
          if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') return false;
          const httpStatus = error.data?.httpStatus;
          if (httpStatus === 401 || httpStatus === 403) return false;
        }
        return failureCount < 3;
      },
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  // Circuit breaker: if we're already redirecting, do NOT process further errors
  if (isAuthRedirecting()) return;
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isSuspended = error.message?.includes("ROLE_SUSPENDED") || error.message?.includes("موقوف") || error.message?.includes("مراجعة الإدارة");
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG || error.data?.code === 'UNAUTHORIZED';

  if (!isUnauthorized && !isSuspended) return;

  // ---- Activate circuit breaker IMMEDIATELY to stop all further processing ----
  setAuthRedirecting(true);

  // مسح التخزين المحلي لتجنب استرجاع الجلسة المعلقة
  localStorage.removeItem("manus-runtime-user-info");

  // إلغاء جميع الاستعلامات الجارية ثم مسح الكاش
  queryClient.cancelQueries();
  queryClient.clear();

  // إذا كنا بالفعل في صفحات تسجيل الدخول، لا نعيد التوجيه (نترك المكون يعرض الخطأ)
  const currentPath = window.location.pathname;
  if (currentPath === '/login' || currentPath === '/admin/login') {
    setAuthRedirecting(false); 
    return;
  }

  if (isSuspended) {
    // تحديد صفحة تسجيل الدخول المناسبة (موظفين أم مستفيدين)
    const isAdminPath = currentPath === '/dashboard' || currentPath.startsWith('/admin') || 
                        ['/staff', '/users', '/roles', '/mosques', '/requests', '/projects'].some(p => currentPath.startsWith(p));
    const targetLogin = isAdminPath ? '/admin/login' : '/login';
    
    // توجيه نظيف باستخدام reload الصفحة لضمان انتهاء الحلقة المفرغة
    window.location.href = `${targetLogin}?error=suspended`;
  } else {
    window.location.href = '/login';
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
