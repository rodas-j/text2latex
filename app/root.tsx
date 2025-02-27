import { useEffect } from "react";
import { useLocation } from "@remix-run/react";
import { usePostHog } from "posthog-js/react";
import { ClerkApp, useAuth } from "@clerk/remix";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";
import { ThemeProvider } from "~/components/theme-provider";
import { APP_VERSION } from "./utils/version";
import { checkAndClearConvexCache } from "./utils/convex-helpers";
import ErrorBoundary from "./components/ErrorBoundary";

import "./tailwind.css";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";

export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap",
  },
];

export const meta: MetaFunction = () => {
  return [
    { title: "Text2LaTeX - Convert Text to LaTeX Online" },
    {
      name: "description",
      content:
        "Free online tool to convert plain text and mathematical expressions to LaTeX code. Simple, fast, and accurate LaTeX conversion powered by AI.",
    },
    {
      name: "keywords",
      content:
        "LaTeX converter, text to LaTeX, math to LaTeX, online LaTeX tool, LaTeX generator",
    },
  ];
};

// Create a singleton Convex client to be used throughout the app
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function App() {
  const location = useLocation();
  const posthog = usePostHog();

  useEffect(() => {
    // Track page views
    posthog?.capture("$pageview");
  }, [location, posthog]);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Register the service worker with a cache-busting query parameter
      navigator.serviceWorker
        .register(`/sw.js?v=${APP_VERSION}`)
        .then((registration) => {
          console.log(
            "Service Worker registered with scope:",
            registration.scope
          );

          // Check if there's a version mismatch and the service worker needs updating
          if (localStorage.getItem("app_version") !== APP_VERSION) {
            // Send message to service worker to clear caches
            if (registration.active) {
              registration.active.postMessage({ type: "CLEAR_CACHE" });
            }

            // Update the stored version
            localStorage.setItem("app_version", APP_VERSION);
          }
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  // Check and clear Convex cache if needed
  useEffect(() => {
    checkAndClearConvexCache(convex);

    // Add error event listener to automatically clear cache on Convex errors
    const handleError = (event: ErrorEvent) => {
      if (
        event.error &&
        (event.error.toString().includes("Convex") ||
          event.error.toString().includes("getHistory"))
      ) {
        console.log("Detected Convex error, clearing cache...");
        checkAndClearConvexCache(convex);
        // Reload the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    };

    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Add cache control headers */}
        <meta
          http-equiv="Cache-Control"
          content="no-cache, no-store, must-revalidate"
        />
        <meta http-equiv="Pragma" content="no-cache" />
        <meta http-equiv="Expires" content="0" />
        {/* Add version for cache busting */}
        <meta name="app-version" content={APP_VERSION} />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-full flex-col">
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <ErrorBoundary convexClient={convex}>
              <Header />
              <div className="flex-1">
                <Outlet />
              </div>
              <Footer />
            </ErrorBoundary>
            <ScrollRestoration />
            <Scripts />
          </ThemeProvider>
        </ConvexProviderWithClerk>
      </body>
    </html>
  );
}

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Wrap your app with `ClerkApp`
export default ClerkApp(App, {
  publishableKey: PUBLISHABLE_KEY,
  signInFallbackRedirectUrl: "/",
  signUpFallbackRedirectUrl: "/",
});
