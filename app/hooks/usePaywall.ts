import { useFeatureFlagEnabled } from "posthog-js/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function usePaywall() {
  // Check PostHog feature flag for gradual rollout
  const paywallEnabled = useFeatureFlagEnabled("paywall-enabled");

  // Get user's subscription and usage info
  const usageInfo = useQuery(api.conversions.getUserUsageInfo);
  const subscriptionStatus = useQuery(api.stripe.getSubscriptionStatus);

  return {
    // Feature flag status (null means still loading)
    paywallEnabled: paywallEnabled ?? false,
    isPaywallLoading: paywallEnabled === null,

    // User subscription info
    isPro: usageInfo?.isPro ?? false,
    tier: usageInfo?.tier ?? "anonymous",
    isAuthenticated: usageInfo?.isAuthenticated ?? false,

    // Usage info
    conversionsToday: usageInfo?.conversionsToday ?? 0,
    dailyLimit: usageInfo?.dailyLimit ?? 5,
    maxInputLength: usageInfo?.maxInputLength ?? 5000,
    remainingConversions:
      usageInfo?.dailyLimit === Infinity
        ? Infinity
        : (usageInfo?.dailyLimit ?? 5) - (usageInfo?.conversionsToday ?? 0),

    // Subscription details
    subscriptionPeriodEnd: subscriptionStatus?.periodEnd,
    hasActiveSubscription: subscriptionStatus?.hasActiveSubscription ?? false,

    // Loading states
    isUsageLoading: usageInfo === undefined,
    isSubscriptionLoading: subscriptionStatus === undefined,
  };
}
