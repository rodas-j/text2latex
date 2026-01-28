import type { MetaFunction } from "@remix-run/node";
import { useState, useCallback, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Header } from "~/components/Header";
import { InputSection } from "~/components/InputSection";
import { OutputSection } from "~/components/OutputSection";
import { TabsComponent } from "~/components/TabsComponent";
import { AlertCircle, Zap } from "lucide-react";
import { useAnalytics } from "~/hooks/useAnalytics";
import { ConversionDrawer } from "~/components/ConversionDrawer";
import { StarButton } from "~/components/StarButton";
import { Id } from "@/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, SignInButton } from "@clerk/remix";
import { usePaywall } from "~/hooks/usePaywall";
import { UpgradeModal } from "~/components/UpgradeModal";
import { UsageIndicator } from "~/components/UsageIndicator";

export const meta: MetaFunction = () => {
  return [
    { title: "Text to LaTeX Converter - Free AI-Powered LaTeX Generator | Text2LaTeX" },
    {
      name: "description",
      content:
        "Convert text to LaTeX instantly with our free AI-powered converter. Perfect for math equations, scientific notation, and academic papers. No LaTeX knowledge required.",
    },
    // Open Graph
    { property: "og:title", content: "Text to LaTeX Converter - Free AI Tool" },
    { property: "og:description", content: "Convert plain text to LaTeX equations instantly. Perfect for students, researchers, and academics." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://text2latex.com" },
    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Text to LaTeX Converter" },
    { name: "twitter:description", content: "AI-powered LaTeX conversion for math equations and scientific notation." },
    // SEO
    { name: "keywords", content: "text to latex, latex converter, math to latex, equation generator, latex equation editor, ai latex, convert text to latex" },
    { name: "robots", content: "index, follow" },
  ];
};

export default function Index() {
  const { track, trackError, withPerformanceTracking } = useAnalytics();
  const { isSignedIn } = useAuth();
  const [copied, setCopied] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isRateLimitError, setIsRateLimitError] = useState(false);
  const [isTextLong, setIsTextLong] = useState(false);
  const [text, setText] = useState("");
  const [latex, setLatex] = useState("");
  const [loading, setLoading] = useState(false);
  const [skipAutoTranslate, setSkipAutoTranslate] = useState(false);
  const [lastConversionId, setLastConversionId] = useState<
    Id<"conversions"> | undefined
  >(undefined);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPaywallLimitError, setIsPaywallLimitError] = useState(false);

  const convertToLatex = useAction(api.conversions.convertToLatex);

  // Paywall hook for feature flag and usage tracking
  const {
    paywallEnabled,
    isPro,
    remainingConversions,
    dailyLimit,
    maxInputLength,
    isAuthenticated,
  } = usePaywall();

  // Check for upgrade success/cancelled in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const upgradeStatus = params.get("upgrade");
    if (upgradeStatus === "success") {
      track("upgrade_completed", { source: "checkout_redirect" });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (upgradeStatus === "cancelled") {
      track("upgrade_cancelled", { source: "checkout_redirect" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [track]);

  // Helper function to detect input type
  const detectInputType = useCallback(
    (input: string): "text" | "math" | "code" => {
      // Simple heuristics to detect input type
      const mathPatterns = /[\$\\\(\)\[\]\{\}\^\_\=\+\-\*\/\<\>]/;
      const codePatterns = /[{};\(\)\[\]]/;

      if (mathPatterns.test(input) && input.includes("$")) return "math";
      if (codePatterns.test(input)) return "code";
      return "text";
    },
    []
  );

  const handleTranscribe = useCallback(async () => {
    if (!text) return;

    const conversionStartTime = Date.now();

    // Track conversion start
    track("conversion_started", {
      input_length: text.length,
      input_type: detectInputType(text),
      paywall_enabled: paywallEnabled,
      is_pro: isPro,
    });

    // Use dynamic max input length based on subscription tier
    const effectiveMaxLength = paywallEnabled ? maxInputLength : 5000;

    if (text.length > effectiveMaxLength) {
      setIsTextLong(true);
      track("conversion_failed", {
        input_length: text.length,
        error_message: "Text too long",
        error_type: "length_limit",
        max_length: effectiveMaxLength,
      });
      return;
    }

    setIsTextLong(false);
    setErrorText("");
    setIsRateLimitError(false);
    setIsPaywallLimitError(false);
    setLoading(true);

    try {
      // Prepare conversion parameters
      const conversionParams: {
        text: string;
        sessionId?: string;
        paywallEnabled?: boolean;
      } = {
        text,
        paywallEnabled,
      };

      // For anonymous users, generate and include sessionId
      if (!isSignedIn) {
        let sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          localStorage.setItem("sessionId", sessionId);
        }
        conversionParams.sessionId = sessionId;
      }

      const result = await withPerformanceTracking(
        () => convertToLatex(conversionParams),
        "latex_conversion_api"
      );

      const conversionDuration = Date.now() - conversionStartTime;

      setLatex(result.data);
      setLastConversionId(result.conversionId);

      track("conversion_completed", {
        input_length: text.length,
        output_length: result.data.length,
        duration_ms: conversionDuration,
        success: true,
        is_pro: result.isPro,
        remaining_conversions: result.remainingFreeConversions,
      });
    } catch (error) {
      const conversionDuration = Date.now() - conversionStartTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.log("Actual error message:", errorMessage);

      const lowerErrorMessage = errorMessage.toLowerCase();

      // Check for paywall/daily limit errors
      const isPaywallLimit =
        lowerErrorMessage.includes("daily limit reached") ||
        lowerErrorMessage.includes("upgrade to pro");

      // Check if it's a rate limit error
      const isRateLimit =
        lowerErrorMessage.includes("rate limit") ||
        lowerErrorMessage.includes("too many requests") ||
        lowerErrorMessage.includes("limit exceeded") ||
        lowerErrorMessage.includes("rate limited") ||
        lowerErrorMessage.includes("quota exceeded") ||
        lowerErrorMessage.includes("requests per") ||
        lowerErrorMessage.includes("429") ||
        errorMessage.includes("RateLimitError");

      if (isPaywallLimit) {
        // Paywall limit - show upgrade modal
        setErrorText(errorMessage);
        setIsPaywallLimitError(true);
        setShowUpgradeModal(true);

        // Track specific limit_reached event for conversion analysis
        track("limit_reached", {
          user_tier: isPro ? "pro" : isAuthenticated ? "free" : "anonymous",
          conversions_today: dailyLimit - remainingConversions,
          daily_limit: dailyLimit,
          is_authenticated: isAuthenticated,
          input_length: text.length,
        });

        track("conversion_failed", {
          input_length: text.length,
          error_message: errorMessage,
          error_type: "paywall_limit",
        });
      } else if (isRateLimit || !isSignedIn) {
        const friendlyMessage = isSignedIn
          ? "You're making requests too quickly. Please wait a moment and try again."
          : "You've reached your daily limit of 5 free conversions. Sign up to get more conversions!";
        setErrorText(friendlyMessage);
        setIsRateLimitError(true);

        track("conversion_failed", {
          input_length: text.length,
          error_message: errorMessage,
          error_type: "rate_limit",
        });
      } else {
        setErrorText("Failed to convert text. Please try again.");
        setIsRateLimitError(false);

        track("conversion_failed", {
          input_length: text.length,
          error_message: errorMessage,
          error_type: "api_error",
        });
      }

      trackError(
        error instanceof Error ? error : new Error(errorMessage),
        "Index.handleTranscribe",
        {
          input_length: text.length,
          duration_ms: conversionDuration,
        }
      );

      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [
    text,
    isSignedIn,
    convertToLatex,
    withPerformanceTracking,
    track,
    trackError,
    detectInputType,
    paywallEnabled,
    isPro,
    maxInputLength,
  ]);

  const handleHistorySelect = (input: string, output: string) => {
    track("history_item_selected", {
      item_index: 0, // We don't have index info, but we track the selection
      input_length: input.length,
      output_length: output.length,
    });

    setSkipAutoTranslate(true);
    setText(input);
    setLatex(output);
    // Reset skipAutoTranslate after a short delay to allow for future edits to trigger translation
    setTimeout(() => setSkipAutoTranslate(false), 100);
  };

  return (
    <div className="container mx-auto p-4">
      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        remainingConversions={remainingConversions}
        dailyLimit={dailyLimit}
      />

      {/* Usage Indicator - show in top right when paywall is enabled */}
      {paywallEnabled && isSignedIn && (
        <div className="flex justify-end mb-4">
          <UsageIndicator onUpgradeClick={() => setShowUpgradeModal(true)} />
        </div>
      )}

      {errorText && (
        <Alert variant="destructive" className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <AlertTitle>
                  {isPaywallLimitError
                    ? "Daily Limit Reached"
                    : isRateLimitError
                      ? "Rate Limit"
                      : "Error"}
                </AlertTitle>
                <AlertDescription>{errorText}</AlertDescription>
              </div>
            </div>
            {isPaywallLimitError && isSignedIn ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                Upgrade to Pro
              </Button>
            ) : isRateLimitError && !isSignedIn ? (
              <SignInButton mode="modal">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    track("auth_sign_in_started", {
                      method: "rate_limit_error",
                    })
                  }
                >
                  Sign Up for Free
                </Button>
              </SignInButton>
            ) : null}
          </div>
        </Alert>
      )}

      {isTextLong && (
        <Alert variant="destructive" className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <AlertTitle>Text Too Long</AlertTitle>
                <AlertDescription>
                  Maximum {maxInputLength.toLocaleString()} characters allowed.
                  {!isPro && paywallEnabled && " Upgrade to Pro for 50,000 characters."}
                </AlertDescription>
              </div>
            </div>
            {!isPro && paywallEnabled && isSignedIn && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                Upgrade
              </Button>
            )}
          </div>
        </Alert>
      )}

      <TabsComponent
        onToolClick={(toolName) => {
          track("tool_clicked", {
            tool_name: toolName,
            url: "https://jenni.ai/?via=text2latex",
          });
          track("external_link_clicked", {
            url: "https://jenni.ai/?via=text2latex",
            link_text: toolName,
            location: "tools_tab",
          });
        }}
      />
      <div className="grid md:grid-cols-2 gap-6">
        <InputSection
          text={text}
          setText={setText}
          handleTranscribe={handleTranscribe}
          loading={loading}
          isTextLong={isTextLong}
          output={latex}
          lastConversionId={lastConversionId}
          skipAutoTranslate={skipAutoTranslate}
        />
        <OutputSection
          latex={latex}
          input={text}
          copied={copied}
          setCopied={setCopied}
          lastConversionId={lastConversionId}
        />
      </div>

      <div className="flex justify-center items-center mt-6 gap-4">
        <ConversionDrawer onSelect={handleHistorySelect} />
      </div>

      {/* FAQ Section for SEO */}
      <section className="mt-16 mb-8 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          <details className="group border rounded-lg">
            <summary className="flex justify-between items-center cursor-pointer p-4 font-medium">
              How do I convert text to LaTeX?
              <span className="transition group-open:rotate-180">▼</span>
            </summary>
            <p className="px-4 pb-4 text-muted-foreground">
              Simply type or paste your text, math expressions, or equations into the input box.
              Our AI will automatically convert it to properly formatted LaTeX code that you can
              copy and use in your documents, Overleaf, or any LaTeX editor.
            </p>
          </details>

          <details className="group border rounded-lg">
            <summary className="flex justify-between items-center cursor-pointer p-4 font-medium">
              What types of content can Text2LaTeX convert?
              <span className="transition group-open:rotate-180">▼</span>
            </summary>
            <p className="px-4 pb-4 text-muted-foreground">
              Text2LaTeX can convert mathematical equations, fractions, integrals, summations,
              matrices, Greek symbols, chemical formulas, physics notation, and general scientific
              text. It handles both simple expressions like "x squared" and complex multi-line equations.
            </p>
          </details>

          <details className="group border rounded-lg">
            <summary className="flex justify-between items-center cursor-pointer p-4 font-medium">
              Is Text2LaTeX free to use?
              <span className="transition group-open:rotate-180">▼</span>
            </summary>
            <p className="px-4 pb-4 text-muted-foreground">
              Yes! Text2LaTeX offers free conversions every day. For power users who need more
              conversions and longer input limits, we offer an affordable Pro plan.
            </p>
          </details>

          <details className="group border rounded-lg">
            <summary className="flex justify-between items-center cursor-pointer p-4 font-medium">
              Can I use the output in Overleaf or other LaTeX editors?
              <span className="transition group-open:rotate-180">▼</span>
            </summary>
            <p className="px-4 pb-4 text-muted-foreground">
              Absolutely! The LaTeX output is fully compatible with Overleaf, TeXmaker, LaTeX Workshop
              for VS Code, and any other standard LaTeX editor. Just copy the output and paste it into
              your document.
            </p>
          </details>

          <details className="group border rounded-lg">
            <summary className="flex justify-between items-center cursor-pointer p-4 font-medium">
              Do I need to know LaTeX to use this tool?
              <span className="transition group-open:rotate-180">▼</span>
            </summary>
            <p className="px-4 pb-4 text-muted-foreground">
              No! That's the whole point. Just describe your equation in plain English or type it
              naturally (like "integral from 0 to infinity of e to the negative x squared dx"),
              and we'll generate the proper LaTeX syntax for you.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
