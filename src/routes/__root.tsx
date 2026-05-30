import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useSiteSettings, s } from "@/lib/site-settings";
import { Gavel, Shield, Eye, ShieldAlert } from "lucide-react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex gap-2 justify-center">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Property Auction House — Premier Real Estate Auctions" },
      { name: "description", content: "Discover, bid, and win exclusive properties at Property Auction House." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  const { user, signOut, isAdmin, viewMode, setViewMode } = useAuth();
  const { data: settings } = useSiteSettings();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const companyName = s(settings, "company_name", "Property Auction House");
  const logoUrl = s(settings, "company_logo_url", "");

  function handleToggleView() {
    const next = viewMode === "admin" ? "public" : "admin";
    // Purge cached admin/public data so neither view shows stale leaks.
    qc.clear();
    setViewMode(next);
    // If leaving admin view while on an admin-only route, send to home.
    if (next === "public" && pathname.startsWith("/admin")) {
      router.navigate({ to: "/" });
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="h-9 w-9 rounded-md object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Gavel className="h-5 w-5" />
            </div>
          )}
          <div className="leading-tight">
            <div className="font-display text-lg font-bold text-primary">{companyName}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Est. Trusted Bidding</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/notice"
            title="Important Notice & System Requirements"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-secondary/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Important Notice</span>
          </Link>
          {isAdmin && (
            <button
              onClick={handleToggleView}
              title="Toggle Admin / Public view"
              className="inline-flex items-center gap-1.5 rounded-md border border-gold bg-gold/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-gold/20"
            >
              {viewMode === "admin" ? <Shield className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {viewMode === "admin" ? "Admin view" : "Public view"}
            </button>
          )}
          {isAdmin && viewMode === "admin" && (
            <Link to="/admin" className="rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/90">
              Dashboard
            </Link>
          )}
          {user ? (
            <button
              onClick={() => signOut()}
              className="rounded-md border border-border bg-card px-4 py-2 font-medium hover:bg-accent"
            >
              Sign out
            </button>
          ) : (
            <>
              <Link to="/login" className="rounded-md px-4 py-2 font-medium hover:bg-accent">Log in</Link>
              <Link to="/signup" className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Header />
        <Outlet />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
