import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Zap, Loader2 } from "lucide-react";
import { useAnalytics } from "~/hooks/useAnalytics";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingConversions?: number;
  dailyLimit?: number;
}

const PRICING = {
  monthly: {
    price: "$5",
    period: "month",
    savings: null,
  },
  yearly: {
    price: "$30",
    period: "year",
    savings: "Save 50%",
  },
};

const FEATURES = [
  "Unlimited daily conversions",
  "50,000 character input limit (10x free)",
  "Priority support",
  "Early access to new features",
];

export function UpgradeModal({
  open,
  onOpenChange,
  remainingConversions,
  dailyLimit,
}: UpgradeModalProps) {
  const { track } = useAnalytics();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);

  const handleUpgrade = async () => {
    setIsLoading(true);
    track("upgrade_started", {
      plan: selectedPlan,
      remaining_conversions: remainingConversions,
    });

    try {
      const result = await createCheckoutSession({
        priceType: selectedPlan,
        successUrl: `${window.location.origin}/?upgrade=success`,
        cancelUrl: `${window.location.origin}/?upgrade=cancelled`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      track("upgrade_failed", {
        plan: selectedPlan,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            {remainingConversions !== undefined && dailyLimit !== undefined ? (
              <>
                You've used {dailyLimit - remainingConversions} of {dailyLimit} free
                conversions today. Upgrade for unlimited access.
              </>
            ) : (
              "Get unlimited conversions and more with Pro."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Plan Selection */}
          <div className="grid grid-cols-2 gap-3">
            {(["monthly", "yearly"] as const).map((plan) => (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  selectedPlan === plan
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {PRICING[plan].savings && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {PRICING[plan].savings}
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
          <div className="space-y-2 pt-4">
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

          {/* Upgrade Button */}
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

          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime. Secure payment via Stripe.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
