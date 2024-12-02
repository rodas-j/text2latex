/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */
import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { PostHogProvider } from "posthog-js/react";

const options = {
  api_host: "https://us.i.posthog.com",
  person_profiles: "identified_only" as const,
  feature_flag_request_timeout_ms: 3000,
};

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
