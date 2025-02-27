/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */
import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { PostHogProvider } from "posthog-js/react";
import { APP_VERSION } from "./utils/version";

const options = {
  api_host: "https://us.i.posthog.com",
  person_profiles: "identified_only" as const,
  feature_flag_request_timeout_ms: 3000,
};

// Cache busting logic
const checkAndClearCache = async () => {
  try {
    // Get the stored version from localStorage
    const storedVersion = localStorage.getItem("app_version");

    // If the version has changed or doesn't exist, clear the cache
    if (!storedVersion || storedVersion !== APP_VERSION) {
      console.log(
        `Version changed from ${storedVersion} to ${APP_VERSION}, clearing cache...`
      );

      // Clear application cache using the Cache API
      if ("caches" in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => window.caches.delete(cacheName))
        );
      }

      // Clear localStorage except for theme preference
      const themePreference = localStorage.getItem("vite-ui-theme");
      localStorage.clear();
      if (themePreference) {
        localStorage.setItem("vite-ui-theme", themePreference);
      }

      // Store the new version
      localStorage.setItem("app_version", APP_VERSION);

      // Reload the page if needed (only if this isn't the first load)
      if (storedVersion) {
        window.location.reload();
      }
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
};

// Run the cache check before hydration
checkAndClearCache();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <PostHogProvider
        apiKey="phc_gnJxS3xB23ajulr5CYQa08YAgf4h3KitxW4wuwbpGdX"
        options={options}
      >
        <RemixBrowser />
      </PostHogProvider>
    </StrictMode>
  );
});
