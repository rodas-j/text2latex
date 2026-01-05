import type { MetaFunction } from "@remix-run/node";
import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, SignInButton } from "@clerk/remix";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Crown,
  Loader2,
  CreditCard,
  Calendar,
  Zap,
  Check,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@remix-run/react";
import { useAnalytics } from "~/hooks/useAnalytics";

export const meta: MetaFunction = () => {
  return [
    { title: "Billing Settings - Text2Latex" },
    { name: "description", content: "Manage your Text2Latex subscription" },
  ];
};

const PRICING = {
  monthly: { price: "$5", period: "month" },
  yearly: { price: "$30", period: "year", savings: "Save 50%" },
};

const FEATURES = [
  "More daily conversions",
  "50,000 character input limit (10x free)",
  "Priority support",
  "Early access to new features",
];

export default function BillingSettings() {
  const { isSignedIn, isLoaded } = useAuth();
  const { track } = useAnalytics();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

  const subscriptionStatus = useQuery(api.stripe.getSubscriptionStatus);
  const usageInfo = useQuery(api.conversions.getUserUsageInfo);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const createPortalSession = useAction(api.stripe.createPortalSession);

  const handleUpgrade = async () => {
    setIsLoading(true);
    track("upgrade_started", { plan: selectedPlan, source: "billing_page" });

    try {
      const result = await createCheckoutSession({
        priceType: selectedPlan,
        successUrl: `${window.location.origin}/settings/billing?upgrade=success`,
        cancelUrl: `${window.location.origin}/settings/billing?upgrade=cancelled`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    track("manage_subscription_clicked", { source: "billing_page" });

    try {
      const result = await createPortalSession({
        returnUrl: `${window.location.origin}/settings/billing`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to create portal session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Sign in to manage billing</h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to view and manage your subscription.
          </p>
          <SignInButton mode="modal">
            <Button>Sign In</Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  const isPro = subscriptionStatus?.hasActiveSubscription;
  const periodEnd = subscriptionStatus?.periodEnd
    ? new Date(subscriptionStatus.periodEnd).toLocaleDateString()
    : null;

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <h1 className="text-3xl font-bold mb-2">Billing Settings</h1>
      <p className="text-muted-foreground mb-8">Manage your subscription and billing</p>

      {/* Current Plan */}
      <div className="border rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Current Plan</h2>

        {isPro ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-full">
                <Crown className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="font-semibold text-lg">Pro Plan</p>
                <p className="text-sm text-muted-foreground">
                  More conversions, 50,000 character limit
                </p>
              </div>
            </div>

            {periodEnd && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Renews on {periodEnd}</span>
              </div>
            )}

            <Button
              onClick={handleManageSubscription}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Subscription
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-full">
                <Zap className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-lg">Free Plan</p>
                <p className="text-sm text-muted-foreground">
                  {usageInfo?.conversionsToday ?? 0} / {usageInfo?.dailyLimit ?? 30} conversions used today
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Section (only show if not Pro) */}
      {!isPro && (
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Upgrade to Pro</h2>

          {/* Plan Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(["monthly", "yearly"] as const).map((plan) => (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                  selectedPlan === plan
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {plan === "yearly" && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Save 50%
                  </span>
                )}
                <div className="text-2xl font-bold">{PRICING[plan].price}</div>
                <div className="text-sm text-muted-foreground">
                  per {PRICING[plan].period}
                </div>
              </button>
            ))}
          </div>

          {/* Features */}
          <div className="space-y-2 mb-6">
            <h4 className="font-medium text-sm">Everything in Pro:</h4>
            <ul className="space-y-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to checkout...
              </>
            ) : (
              <>
                Upgrade to Pro - {PRICING[selectedPlan].price}/{PRICING[selectedPlan].period}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Cancel anytime. Secure payment via Stripe.
          </p>
        </div>
      )}
    </div>
  );
}
