import type { AppProps } from "next/app";
import Script from "next/script";
import "../tailwind.css";
import posthog from 'posthog-js'

function MyApp({ Component, pageProps }: AppProps) {

  posthog.init('phc_gnJxS3xB23ajulr5CYQa08YAgf4h3KitxW4wuwbpGdX', { api_host: 'https://app.posthog.com' });
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
