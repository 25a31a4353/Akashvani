import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, httpLink, splitLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

const isResilientIndiaContextTransportFailure = (queryKey: unknown, error: unknown) => {
  const key = JSON.stringify(queryKey);
  return error instanceof TRPCClientError && error.message === "Failed to fetch" && (key.includes("diva.india.context") || (key.includes("diva") && key.includes("india") && key.includes("context")));
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    if (!isResilientIndiaContextTransportFailure(event.query.queryKey, error)) console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcHeaders = () => {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
  return {};
};

const trpcFetch = (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });

// Allow the backend URL to be configured at build time.
// On localhost, VITE_TRPC_URL is unset → falls back to same-origin "/api/trpc" (unchanged behaviour).
// On Vercel, set VITE_TRPC_URL=https://<backend>.railway.app/api/trpc in Vercel project settings.
const trpcUrl = import.meta.env.VITE_TRPC_URL ?? "/api/trpc";

const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: operation => operation.path === "diva.india.context",
      true: httpLink({ url: trpcUrl, transformer: superjson, headers: trpcHeaders, fetch: trpcFetch, methodOverride: "POST" }),
      false: httpBatchLink({ url: trpcUrl, transformer: superjson, headers: trpcHeaders, fetch: trpcFetch }),
    }),
  ],
});

// Conditionally initialize analytics if configured
const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
const analyticsWebsiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
if (analyticsEndpoint && analyticsWebsiteId && typeof document !== "undefined") {
  const script = document.createElement("script");
  script.defer = true;
  script.src = `${analyticsEndpoint}/umami`;
  script.setAttribute("data-website-id", analyticsWebsiteId);
  document.head.appendChild(script);
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
