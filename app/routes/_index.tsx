import type { MetaFunction } from "@remix-run/node";
import { useState, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Header } from "~/components/Header";
import { InputSection } from "~/components/InputSection";
import { OutputSection } from "~/components/OutputSection";
import { BottomActions } from "~/components/BottomActions";
import { TabsComponent } from "~/components/TabsComponent";
import { AlertCircle } from "lucide-react";
import { useAnalytics } from "~/hooks/useAnalytics";
import { ConversionDrawer } from "~/components/ConversionDrawer";
import { StarButton } from "~/components/StarButton";
import { Id } from "@/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, SignInButton } from "@clerk/remix";

export const meta: MetaFunction = () => {
  return [
    { title: "Text2Latex" },
    {
      name: "description",
      content:
        "Text2Latex is an AI-powered tool that transcribes normal text, code and natural language to LaTeX.",
    },
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

  const convertToLatex = useAction(api.conversions.convertToLatex);

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
    });

    if (text.length > 5000) {
      setIsTextLong(true);
      track("conversion_failed", {
        input_length: text.length,
        error_message: "Text too long",
        error_type: "length_limit",
      });
      return;
    }

    setIsTextLong(false);
    setErrorText("");
    setIsRateLimitError(false);
    setLoading(true);

    try {
      // Prepare conversion parameters
      const conversionParams: { text: string; sessionId?: string } = { text };

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
      });
    } catch (error) {
      const conversionDuration = Date.now() - conversionStartTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Debug: Log the actual error message to see what we're getting
      console.log("Actual error message:", errorMessage);

      // Check if it's a rate limit error - be more comprehensive
      const lowerErrorMessage = errorMessage.toLowerCase();
      const isRateLimit =
        lowerErrorMessage.includes("rate limit") ||
        lowerErrorMessage.includes("too many requests") ||
        lowerErrorMessage.includes("limit exceeded") ||
        lowerErrorMessage.includes("rate limited") ||
        lowerErrorMessage.includes("quota exceeded") ||
        lowerErrorMessage.includes("daily limit") ||
        lowerErrorMessage.includes("requests per") ||
        lowerErrorMessage.includes("429") ||
        errorMessage.includes("RateLimitError");

      if (isRateLimit || !isSignedIn) {
        // For anonymous users, assume most errors are rate limit related since they have strict limits
        const friendlyMessage = isSignedIn
          ? "You're making requests too quickly. Please wait a moment and try again."
          : "You've reached your daily limit of 5 free conversions. Sign up to get unlimited conversions!";
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

  const handleExternalLinkClick = (url: string, linkText: string) => {
    track("external_link_clicked", {
      url,
      link_text: linkText,
      location: "promotional_section",
    });
  };

  return (
    <div className="container mx-auto p-4">
      {errorText && (
        <Alert variant="destructive" className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <AlertTitle>
                  {isRateLimitError ? "Daily Limit Reached" : "Error"}
                </AlertTitle>
                <AlertDescription>{errorText}</AlertDescription>
              </div>
            </div>
            {isRateLimitError && !isSignedIn && (
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
            )}
          </div>
        </Alert>
      )}

      {isTextLong && (
        <Alert variant="destructive" className="mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <div>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Text is too long</AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      <TabsComponent />
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

      {/* Promotional Section */}
      <div className="mt-16 mb-8">
        <h2 className="text-2xl font-bold text-center mb-8">
          Check out our other apps
        </h2>
        <div className="grid md:grid-cols-2 gap-12">
          {/* Word Canvas */}
          <a
            href="https://www.wordcanvas.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center hover:opacity-90 transition-opacity"
            onClick={() =>
              handleExternalLinkClick(
                "https://www.wordcanvas.app/",
                "Word Canvas"
              )
            }
          >
            <div className="w-64 h-64 relative mb-4">
              <img
                src="/word-canvas-logo 2.png"
                alt="Word Canvas"
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="text-xl font-semibold text-center">Word Canvas</h3>
            <p className="text-center text-gray-700 dark:text-gray-300 mt-2">
              Photoshop your images with natural language
            </p>
          </a>

          {/* BeChef */}
          <a
            href="https://apps.apple.com/us/app/bechef-recipe-manager/id6743420060"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center hover:opacity-90 transition-opacity"
            onClick={() =>
              handleExternalLinkClick(
                "https://apps.apple.com/us/app/bechef-recipe-manager/id6743420060",
                "BeChef"
              )
            }
          >
            <div className="w-64 h-64 relative mb-4">
              <img
                src="/bechef-logo-market.png"
                alt="BeChef Recipe Manager"
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="text-xl font-semibold text-center">BeChef</h3>
            <p className="text-center text-gray-700 dark:text-gray-300 mt-2">
              Unblock Recipes Hidden in Plain Sight with the most powerful
              recipe manager on the internet
            </p>
          </a>
        </div>
      </div>

      {/* <BottomActions /> */}
    </div>
  );
}
