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
        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Text2LaTeX",
              "url": "https://text2latex.com",
              "description": "Free AI-powered tool to convert plain text and mathematical expressions to LaTeX code.",
              "applicationCategory": "UtilityApplication",
              "operatingSystem": "Any",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "1200"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "How do I convert text to LaTeX?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Simply type or paste your text, math expressions, or equations into the input box. Our AI will automatically convert it to properly formatted LaTeX code that you can copy and use in your documents, Overleaf, or any LaTeX editor."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What types of content can Text2LaTeX convert?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Text2LaTeX can convert mathematical equations, fractions, integrals, summations, matrices, Greek symbols, chemical formulas, physics notation, and general scientific text."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is Text2LaTeX free to use?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes! Text2LaTeX offers free conversions every day. For power users who need unlimited conversions and longer input limits, we offer an affordable Pro plan."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I use the output in Overleaf or other LaTeX editors?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Absolutely! The LaTeX output is fully compatible with Overleaf, TeXmaker, LaTeX Workshop for VS Code, and any other standard LaTeX editor."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Do I need to know LaTeX to use this tool?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No! Just describe your equation in plain English or type it naturally, and we'll generate the proper LaTeX syntax for you."
                  }
                }
              ]
            })
          }}
        />
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
