import { usePaywall } from "~/hooks/usePaywall";
import { Button } from "@/components/ui/button";
import { Zap, Crown, Loader2 } from "lucide-react";

interface UsageIndicatorProps {
  onUpgradeClick: () => void;
}

export function UsageIndicator({ onUpgradeClick }: UsageIndicatorProps) {
  const {
    paywallEnabled,
    isPaywallLoading,
    isPro,
    tier,
    isAuthenticated,
    conversionsToday,
    dailyLimit,
    remainingConversions,
    isUsageLoading,
  } = usePaywall();

  // Don't show anything if paywall is disabled or still loading
  if (!paywallEnabled || isPaywallLoading || isUsageLoading) {
    return null;
  }

  // Pro users get a badge
  if (isPro) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-full">
        <Crown className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
          Pro
        </span>
      </div>
    );
  }

  // Free/Anonymous users see remaining conversions
  const usagePercent = (conversionsToday / dailyLimit) * 100;
  const isNearLimit = remainingConversions <= 5;
  const isAtLimit = remainingConversions <= 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end">
          <span
            className={`text-sm font-medium ${
              isAtLimit
                ? "text-red-500"
                : isNearLimit
                  ? "text-yellow-500"
                  : "text-muted-foreground"
            }`}
          >
            {remainingConversions} / {dailyLimit} left
          </span>
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isAtLimit
                  ? "bg-red-500"
                  : isNearLimit
                    ? "bg-yellow-500"
                    : "bg-primary"
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onUpgradeClick}
        className="flex items-center gap-1.5 border-yellow-500/50 hover:bg-yellow-500/10 hover:border-yellow-500"
      >
        <Zap className="h-3.5 w-3.5 text-yellow-500" />
        <span className="text-xs font-medium">Upgrade</span>
      </Button>
    </div>
  );
}
