import { useEffect } from "react";
import { useLocation } from "@remix-run/react";
import { ClerkApp, useAuth } from "@clerk/remix";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAnalytics } from "~/hooks/useAnalytics";

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";
import { ThemeProvider } from "~/components/theme-provider";

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

function AppContent() {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    // Track page views with additional context
    const pageName =
      location.pathname === "/" ? "home" : location.pathname.slice(1);
    trackPageView(pageName, {
      search: location.search,
      hash: location.hash,
    });
  }, [location, trackPageView]);

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function App() {
  const convex = new ConvexReactClient(
    import.meta.env.VITE_CONVEX_URL as string
  );

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-full flex-col">
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <AppContent />
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
