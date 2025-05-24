/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */
import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { PostHogProvider } from "posthog-js/react";
import type { PostHog } from "posthog-js";

const options = {
  api_host: "https://us.i.posthog.com",
  person_profiles: "identified_only" as const,
  feature_flag_request_timeout_ms: 3000,
  // Enhanced tracking options
  capture_pageview: true,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskInputOptions: {
      password: true,
      email: false,
    },
    // Enhanced session recording options
    minimum_session_duration_ms: 1000,
    sample_rate: 1,
    recordCanvas: true,
    recordCrossOriginIframes: false,
  },
  autocapture: true, // Using default autocapture settings for better compatibility
  // Automatically capture performance metrics
  capture_performance: true,
  // Track heatmaps and click events
  enable_heatmaps: true,
  // Capture console logs for debugging
  enable_recording_console_log: true,
  // Cross-domain linking if needed
  cross_subdomain_cookie: false,
  // Privacy settings
  respect_dnt: true,
  opt_out_capturing_by_default: false,
  // Advanced options
  loaded: (posthog: PostHog) => {
    // Set up additional tracking when PostHog loads
    if (process.env.NODE_ENV === "development") {
      posthog.debug();
    }

    // Track initial page load performance
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const pageLoadTime = timing.loadEventEnd - timing.navigationStart;

      posthog.capture("page_load_performance", {
        load_time_ms: pageLoadTime,
        dom_ready_time_ms:
          timing.domContentLoadedEventEnd - timing.navigationStart,
        dns_time_ms: timing.domainLookupEnd - timing.domainLookupStart,
        tcp_time_ms: timing.connectEnd - timing.connectStart,
        request_time_ms: timing.responseStart - timing.requestStart,
        response_time_ms: timing.responseEnd - timing.responseStart,
        processing_time_ms: timing.domComplete - timing.domLoading,
        // Enhanced performance metrics
        first_contentful_paint: performance
          .getEntriesByType("paint")
          .find((entry) => entry.name === "first-contentful-paint")?.startTime,
        largest_contentful_paint: performance
          .getEntriesByType("largest-contentful-paint")
          .pop()?.startTime,
        cumulative_layout_shift: performance
          .getEntriesByType("layout-shift")
          .reduce((sum, entry) => sum + (entry as any).value, 0),
      });
    }

    // Track initial viewport size
    posthog.capture("viewport_size", {
      width: window.innerWidth,
      height: window.innerHeight,
      device_pixel_ratio: window.devicePixelRatio,
      orientation: window.screen.orientation?.type || "unknown",
    });

    // Track browser capabilities
    posthog.capture("browser_capabilities", {
      has_local_storage: typeof Storage !== "undefined",
      has_session_storage: typeof Storage !== "undefined",
      has_indexeddb: "indexedDB" in window,
      has_websockets: "WebSocket" in window,
      has_webgl: !!window.WebGLRenderingContext,
      connection_type:
        (navigator as any).connection?.effectiveType || "unknown",
      is_mobile:
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ),
      // Enhanced browser capabilities
      has_service_worker: "serviceWorker" in navigator,
      has_push_notifications: "PushManager" in window,
      has_geolocation: "geolocation" in navigator,
      has_notifications: "Notification" in window,
      has_web_rtc: "RTCPeerConnection" in window,
      has_web_assembly: typeof WebAssembly === "object",
      has_web_animations: "animate" in document.documentElement,
      has_web_audio: "AudioContext" in window || "webkitAudioContext" in window,
      has_web_vr: "getVRDisplays" in navigator,
      has_web_workers: typeof Worker !== "undefined",
    });
  },
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
