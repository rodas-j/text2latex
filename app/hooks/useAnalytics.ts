import { usePostHog } from "posthog-js/react";
import { useAuth, useUser } from "@clerk/remix";
import { useEffect, useCallback } from "react";

// Define event types for better type safety
export type AnalyticsEvent = {
  // Conversion events
  conversion_started: {
    input_length: number;
    input_type?: "text" | "math" | "code";
  };
  conversion_completed: {
    input_length: number;
    output_length: number;
    duration_ms: number;
    success: boolean;
  };
  conversion_failed: {
    input_length: number;
    error_message: string;
    error_type:
      | "length_limit"
      | "api_error"
      | "network_error"
      | "rate_limit"
      | "paywall_limit"
      | "unknown";
  };

  // Paywall events
  limit_reached: {
    user_tier: "pro" | "free" | "anonymous";
    conversions_today: number;
    daily_limit: number;
    is_authenticated: boolean;
    input_length: number;
  };
  upgrade_modal_shown: {
    source: "limit_reached" | "header" | "usage_indicator" | "billing_page";
    remaining_conversions?: number;
  };
  upgrade_started: {
    plan: "monthly" | "yearly";
    source: string;
  };
  upgrade_completed: {
    source: string;
  };
  upgrade_cancelled: {
    source: string;
  };
  manage_subscription_clicked: {
    source: string;
  };

  // User interaction events
  text_input_changed: {
    length: number;
    is_paste?: boolean;
  };
  output_copied: {
    output_length: number;
    copy_method: "button" | "keyboard";
  };
  output_downloaded: {
    output_length: number;
    format: string;
  };

  // Navigation events
  page_viewed: {
    page: string;
    referrer?: string;
  };
  external_link_clicked: {
    url: string;
    link_text?: string;
    location: string;
  };

  // UI interaction events
  theme_toggled: {
    from_theme: string;
    to_theme: string;
  };
  tab_switched: {
    from_tab: string;
    to_tab: string;
  };
  history_opened: {
    has_history: boolean;
    history_count?: number;
  };
  history_item_selected: {
    item_index: number;
    input_length: number;
    output_length: number;
  };

  // Authentication events
  auth_sign_in_started: {
    method?: string;
  };
  auth_sign_in_completed: {
    method?: string;
    duration_ms?: number;
  };
  auth_sign_out: {};

  // Tool affiliate clicks
  tool_clicked: {
    tool_name: string;
    url: string;
  };

  // Feature usage
  star_clicked: {
    conversion_id?: string;
    is_starred: boolean;
  };
  feedback_submitted: {
    rating?: number;
    has_comment: boolean;
  };

  // Performance events
  api_call_performance: {
    endpoint: string;
    duration_ms: number;
    success: boolean;
    status_code?: number;
  };

  // Error events
  error_occurred: {
    error_type: string;
    error_message: string;
    component?: string;
    stack_trace?: string;
  };
};

export function useAnalytics() {
  const posthog = usePostHog();
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();

  // Identify user when they sign in
  useEffect(() => {
    if (isSignedIn && userId && user) {
      posthog?.identify(userId, {
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        imageUrl: user.imageUrl,
      });
    }
  }, [isSignedIn, userId, user, posthog]);

  // Track event with proper typing
  const track = useCallback(
    <T extends keyof AnalyticsEvent>(
      event: T,
      properties?: AnalyticsEvent[T] & Record<string, any>
    ) => {
      if (!posthog) return;

      // Add common properties to all events
      const commonProperties = {
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        is_authenticated: isSignedIn,
        user_id: userId,
      };

      posthog.capture(event, {
        ...properties,
        ...commonProperties,
      });
    },
    [posthog, isSignedIn, userId]
  );

  // Track page view with additional context
  const trackPageView = useCallback(
    (page: string, additionalProps?: Record<string, any>) => {
      track("page_viewed", {
        page,
        referrer: document.referrer,
        url: window.location.href,
        ...additionalProps,
      });
    },
    [track]
  );

  // Track performance metrics
  const trackPerformance = useCallback(
    (
      endpoint: string,
      startTime: number,
      success: boolean,
      statusCode?: number
    ) => {
      const duration = Date.now() - startTime;
      track("api_call_performance", {
        endpoint,
        duration_ms: duration,
        success,
        status_code: statusCode,
      });
    },
    [track]
  );

  // Track errors with context
  const trackError = useCallback(
    (
      error: Error | string,
      component?: string,
      additionalContext?: Record<string, any>
    ) => {
      const errorMessage = error instanceof Error ? error.message : error;
      const stackTrace = error instanceof Error ? error.stack : undefined;

      track("error_occurred", {
        error_type:
          error instanceof Error ? error.constructor.name : "StringError",
        error_message: errorMessage,
        component,
        stack_trace: stackTrace,
        ...additionalContext,
      });
    },
    [track]
  );

  // Utility to measure function execution time
  const withPerformanceTracking = useCallback(
    async <T>(fn: () => Promise<T>, endpoint: string): Promise<T> => {
      const startTime = Date.now();
      try {
        const result = await fn();
        trackPerformance(endpoint, startTime, true);
        return result;
      } catch (error) {
        trackPerformance(endpoint, startTime, false);
        throw error;
      }
    },
    [trackPerformance]
  );

  return {
    track,
    trackPageView,
    trackPerformance,
    trackError,
    withPerformanceTracking,
    posthog,
  };
}
