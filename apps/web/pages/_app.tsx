import type { AppProps } from "next/app";
import Script from "next/script";
import "../tailwind.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script
        strategy="afterInteractive"
        defer
        data-domain="text2latex.com"
        src="https://plausible.io/js/script.js"
      />

      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
