import { useEffect } from "react";
import { useLocation } from "@remix-run/react";
import { usePostHog } from "posthog-js/react";
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

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
          <ScrollRestoration />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  );
}

export default function App() {
  const location = useLocation();
  const posthog = usePostHog();

  useEffect(() => {
    // Track page views
    posthog?.capture("$pageview");
  }, [location, posthog]);

  return <Outlet />;
}
