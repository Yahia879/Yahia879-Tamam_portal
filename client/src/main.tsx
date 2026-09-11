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
import { toast } from "sonner";

// اعتراض وتطهير أي رسائل خطأ غامضة مثل "Unexpected token <" أو "Unexpected ..." لتحويلها لرسالة واضحة للمستخدم
const originalToastError = toast.error;
(toast as any).error = (message: any, data?: any) => {
  if (typeof message === "string" && /unexpect|<|syntaxerror|not valid json/i.test(message)) {
    return originalToastError("حدث خطأ حاول مرة أخرى", data);
  }
  return originalToastError(message, data);
};

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
      async fetch(input, init) {
        const response = await globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });

        // حماية من خطأ Unexpected token < في حال إرجاع الخادم أو البروكسي صفحة HTML (مثل خطأ 502 أو 500)
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          try {
            const isBatch = typeof input === "string" ? input.includes("batch=1") : false;
            const errorObj = {
              error: {
                message: "حدث خطأ حاول مرة أخرى",
                code: -32603,
                data: {
                  code: "INTERNAL_SERVER_ERROR",
                  httpStatus: response.status || 500,
                },
              },
            };
            return new Response(JSON.stringify(isBatch ? [errorObj] : errorObj), {
              status: response.status >= 400 ? response.status : 500,
              statusText: response.statusText,
              headers: { "content-type": "application/json" },
            });
          } catch {
            return response;
          }
        }

        return response;
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
