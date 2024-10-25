import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { ThemeProvider } from "~/components/theme-provider";

import "./tailwind.css";
import { Footer } from "./components/Footer";

export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap",
  },
];

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
  return <Outlet />;
}
