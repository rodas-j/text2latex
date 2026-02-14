import type { MetaFunction } from "@remix-run/node";
import { useState, useCallback, useEffect, type ChangeEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InputSection } from "~/components/InputSection";
import { OutputSection } from "~/components/OutputSection";
import { TabsComponent, type NativeTool } from "~/components/TabsComponent";
import { AlertCircle, Loader2, Upload, Zap, FileDown } from "lucide-react";
import { useAnalytics } from "~/hooks/useAnalytics";
import { ConversionDrawer } from "~/components/ConversionDrawer";
import { Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, SignInButton } from "@clerk/remix";
import { usePaywall } from "~/hooks/usePaywall";
import { UpgradeModal } from "~/components/UpgradeModal";
import { UsageIndicator } from "~/components/UsageIndicator";

function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
}

export const meta: MetaFunction = () => {
  return [
    { title: "Text to LaTeX Converter - Free AI-Powered LaTeX Generator | Text2LaTeX" },
    {
      name: "description",
      content:
        "Convert text to LaTeX instantly with our free AI-powered converter. Perfect for math equations, scientific notation, and academic papers. No LaTeX knowledge required.",
    },
    { property: "og:title", content: "Text to LaTeX Converter - Free AI Tool" },
    { property: "og:description", content: "Convert plain text to LaTeX equations instantly. Perfect for students, researchers, and academics." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://text2latex.com" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Text to LaTeX Converter" },
    { name: "twitter:description", content: "AI-powered LaTeX conversion for math equations and scientific notation." },
    { name: "keywords", content: "text to latex, latex converter, math to latex, equation generator, latex equation editor, ai latex, convert text to latex" },
    { name: "robots", content: "index, follow" },
  ];
};

export default function Index() {
  const { track, trackError, withPerformanceTracking } = useAnalytics();
  const { isSignedIn } = useAuth();

  const [activeTool, setActiveTool] = useState<NativeTool>("text");
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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageLatex, setImageLatex] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");

  const [wordInput, setWordInput] = useState("");
  const [wordLoading, setWordLoading] = useState(false);
  const [wordError, setWordError] = useState("");
  const [wordDownloadUrl, setWordDownloadUrl] = useState("");
  const [wordFileName, setWordFileName] = useState("text2latex.docx");

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPaywallLimitError, setIsPaywallLimitError] = useState(false);

  const convertToLatex = useAction(api.conversions.convertToLatex);
  const convertImageToLatex = useAction(api.conversions.convertImageToLatex);
  const convertLatexToWord = useAction(api.conversions.convertLatexToWord);
  const generateUploadUrl = useMutation(api.conversions.generateUploadUrl);

  const {
    paywallEnabled,
    isPro,
    remainingConversions,
    dailyLimit,
    maxInputLength,
    isAuthenticated,
  } = usePaywall();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const upgradeStatus = params.get("upgrade");
    if (upgradeStatus === "success") {
      track("upgrade_completed", { source: "checkout_redirect" });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (upgradeStatus === "cancelled") {
      track("upgrade_cancelled", { source: "checkout_redirect" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [track]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const detectInputType = useCallback(
    (input: string): "text" | "math" | "code" => {
      const mathPatterns = /[$\\()[\]{}^_=+\-*/<>]/;
      const codePatterns = /[{};()[\]]/;

      if (mathPatterns.test(input) && input.includes("$")) return "math";
      if (codePatterns.test(input)) return "code";
      return "text";
    },
    []
  );

  const handleTranscribe = useCallback(async () => {
    if (!text) return;

    const conversionStartTime = Date.now();

    track("conversion_started", {
      input_length: text.length,
      input_type: detectInputType(text),
      paywall_enabled: paywallEnabled,
      is_pro: isPro,
      tool: "text-to-latex",
    });

    const effectiveMaxLength = paywallEnabled ? maxInputLength : 5000;

    if (text.length > effectiveMaxLength) {
      setIsTextLong(true);
      track("conversion_failed", {
        input_length: text.length,
        error_message: "Text too long",
        error_type: "length_limit",
        max_length: effectiveMaxLength,
        tool: "text-to-latex",
      });
      return;
    }

    setIsTextLong(false);
    setErrorText("");
    setIsRateLimitError(false);
    setIsPaywallLimitError(false);
    setLoading(true);

    try {
      const conversionParams: {
        text: string;
        sessionId?: string;
        paywallEnabled?: boolean;
      } = {
        text,
        paywallEnabled,
      };

      if (!isSignedIn) {
        conversionParams.sessionId = getOrCreateSessionId();
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
        tool: "text-to-latex",
      });
    } catch (error) {
      const conversionDuration = Date.now() - conversionStartTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const lowerErrorMessage = errorMessage.toLowerCase();

      const isPaywallLimit =
        lowerErrorMessage.includes("daily limit reached") ||
        lowerErrorMessage.includes("upgrade to pro");

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
        setErrorText(errorMessage);
        setIsPaywallLimitError(true);
        setShowUpgradeModal(true);

        track("limit_reached", {
          user_tier: isPro ? "pro" : isAuthenticated ? "free" : "anonymous",
          conversions_today: dailyLimit - remainingConversions,
          daily_limit: dailyLimit,
          is_authenticated: isAuthenticated,
          input_length: text.length,
          tool: "text-to-latex",
        });

        track("conversion_failed", {
          input_length: text.length,
          error_message: errorMessage,
          error_type: "paywall_limit",
          tool: "text-to-latex",
        });
      } else if (isRateLimit || !isSignedIn) {
        const friendlyMessage = isSignedIn
          ? "You're making requests too quickly. Please wait a moment and try again."
          : "You've reached your daily limit of 10 free conversions. Sign up to get more conversions!";
        setErrorText(friendlyMessage);
        setIsRateLimitError(true);

        track("conversion_failed", {
          input_length: text.length,
          error_message: errorMessage,
          error_type: "rate_limit",
          tool: "text-to-latex",
        });
      } else {
        setErrorText("Failed to convert text. Please try again.");
        setIsRateLimitError(false);

        track("conversion_failed", {
          input_length: text.length,
          error_message: errorMessage,
          error_type: "api_error",
          tool: "text-to-latex",
        });
      }

      trackError(
        error instanceof Error ? error : new Error(errorMessage),
        "Index.handleTranscribe",
        {
          input_length: text.length,
          duration_ms: conversionDuration,
          tool: "text-to-latex",
        }
      );
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
    isAuthenticated,
    dailyLimit,
    remainingConversions,
  ]);

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    if (!file) {
      setImageFile(null);
      setImagePreviewUrl(null);
      return;
    }

    setImageFile(file);
    setImageLatex("");
    setImageError("");
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleImageToLatex = useCallback(async () => {
    if (!imageFile) {
      setImageError("Please upload an image first.");
      return;
    }

    const conversionStartTime = Date.now();
    setImageLoading(true);
    setImageError("");

    track("conversion_started", {
      input_length: imageFile.size,
      input_type: "text",
      tool: "image-to-latex",
    });

    try {
      const sessionId = !isSignedIn ? getOrCreateSessionId() : undefined;
      const uploadUrl = await generateUploadUrl({ sessionId });

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": imageFile.type,
        },
        body: imageFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed. Please try again.");
      }

      const uploadResult = (await uploadResponse.json()) as {
        storageId?: Id<"_storage">;
      };

      if (!uploadResult.storageId) {
        throw new Error("Upload failed to return storage ID.");
      }

      const result = await withPerformanceTracking(
        () =>
          convertImageToLatex({
            storageId: uploadResult.storageId!,
            sessionId,
          }),
        "image_to_latex_api"
      );

      const conversionDuration = Date.now() - conversionStartTime;
      setImageLatex(result.data);

      track("conversion_completed", {
        input_length: imageFile.size,
        output_length: result.data.length,
        duration_ms: conversionDuration,
        success: true,
        tool: "image-to-latex",
        remaining_conversions: result.remainingFreeConversions,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to convert image.";
      setImageError(errorMessage);

      if (errorMessage.toLowerCase().includes("upgrade to pro")) {
        setShowUpgradeModal(true);
      }

      track("conversion_failed", {
        input_length: imageFile.size,
        error_message: errorMessage,
        error_type: "api_error",
        tool: "image-to-latex",
      });

      trackError(
        error instanceof Error ? error : new Error(errorMessage),
        "Index.handleImageToLatex",
        {
          tool: "image-to-latex",
          input_size: imageFile.size,
        }
      );
    } finally {
      setImageLoading(false);
    }
  }, [
    imageFile,
    isSignedIn,
    track,
    trackError,
    withPerformanceTracking,
    convertImageToLatex,
    generateUploadUrl,
  ]);

  const handleLatexToWord = useCallback(async () => {
    if (!wordInput.trim()) {
      setWordError("Please enter LaTeX content first.");
      return;
    }

    const conversionStartTime = Date.now();
    setWordLoading(true);
    setWordError("");
    setWordDownloadUrl("");

    track("conversion_started", {
      input_length: wordInput.length,
      input_type: "text",
      tool: "latex-to-word",
    });

    try {
      const result = await withPerformanceTracking(
        () => convertLatexToWord({ text: wordInput }),
        "latex_to_word_api"
      );

      const conversionDuration = Date.now() - conversionStartTime;

      if (!result.downloadUrl) {
        throw new Error("Conversion completed but no download URL was returned.");
      }

      setWordDownloadUrl(result.downloadUrl);
      setWordFileName(result.filename || "text2latex.docx");

      track("conversion_completed", {
        input_length: wordInput.length,
        output_length: 1,
        duration_ms: conversionDuration,
        success: true,
        tool: "latex-to-word",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to convert LaTeX to Word.";

      setWordError(errorMessage);

      if (
        errorMessage.toLowerCase().includes("pro-only") ||
        errorMessage.toLowerCase().includes("upgrade")
      ) {
        setShowUpgradeModal(true);
      }

      track("conversion_failed", {
        input_length: wordInput.length,
        error_message: errorMessage,
        error_type: "api_error",
        tool: "latex-to-word",
      });

      trackError(
        error instanceof Error ? error : new Error(errorMessage),
        "Index.handleLatexToWord",
        {
          tool: "latex-to-word",
          input_length: wordInput.length,
        }
      );
    } finally {
      setWordLoading(false);
    }
  }, [wordInput, track, trackError, withPerformanceTracking, convertLatexToWord]);

  const handleHistorySelect = (input: string, output: string) => {
    track("history_item_selected", {
      item_index: 0,
      input_length: input.length,
      output_length: output.length,
    });

    setActiveTool("text");
    setSkipAutoTranslate(true);
    setText(input);
    setLatex(output);
    setTimeout(() => setSkipAutoTranslate(false), 100);
  };

  const renderTextTool = () => (
    <>
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
                  {!isPro && paywallEnabled &&
                    " Upgrade to Pro for 50,000 characters."}
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
    </>
  );

  const renderImageTool = () => (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="border rounded-md p-4 space-y-4 min-h-[30vh]">
          <div>
            <h3 className="text-lg font-medium">Upload an image</h3>
            <p className="text-sm text-muted-foreground">
              Supported: PNG, JPG, WEBP. Free tier includes 5 conversions/day.
            </p>
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="block w-full text-sm"
          />

          {imagePreviewUrl && (
            <img
              src={imagePreviewUrl}
              alt="Uploaded preview"
              className="max-h-64 w-full rounded border object-contain"
            />
          )}

          <Button
            onClick={handleImageToLatex}
            disabled={!imageFile || imageLoading}
            className="w-full"
          >
            {imageLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Convert Image to LaTeX
              </>
            )}
          </Button>

          {imageError && (
            <Alert variant="destructive">
              <AlertTitle>Conversion failed</AlertTitle>
              <AlertDescription>{imageError}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <OutputSection
        latex={imageLatex}
        input={imageFile?.name ?? ""}
        copied={copied}
        setCopied={setCopied}
      />
    </div>
  );

  const renderWordTool = () => {
    const canUseWordTool = isSignedIn && isPro;

    return (
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Textarea
            value={wordInput}
            onChange={(event) => setWordInput(event.target.value)}
            placeholder="Paste LaTeX content here..."
            className="min-h-[30vh] resize-none"
          />

          {!isSignedIn ? (
            <SignInButton mode="modal">
              <Button
                className="w-full"
                onClick={() =>
                  track("auth_sign_in_started", {
                    method: "latex_to_word",
                  })
                }
              >
                Sign in to use LaTeX to Word
              </Button>
            </SignInButton>
          ) : !isPro ? (
            <Button
              className="w-full"
              onClick={() => {
                track("upgrade_modal_shown", {
                  source: "limit_reached",
                });
                setShowUpgradeModal(true);
              }}
            >
              <Zap className="mr-2 h-4 w-4" />
              Upgrade to Pro to Convert
            </Button>
          ) : (
            <Button
              onClick={handleLatexToWord}
              disabled={!wordInput.trim() || wordLoading || !canUseWordTool}
              className="w-full"
            >
              {wordLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating .docx...
                </>
              ) : (
                "Convert LaTeX to Word"
              )}
            </Button>
          )}

          <p className="text-sm text-muted-foreground">
            LaTeX to Word is Pro-only and optimized for fast document export.
          </p>
        </div>

        <div className="border rounded-md p-4 min-h-[30vh] flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Word export</h3>
            <p className="text-sm text-muted-foreground">
              Your generated Word document will be available here for download.
            </p>

            {wordError && (
              <Alert variant="destructive" className="mt-3">
                <AlertTitle>Export failed</AlertTitle>
                <AlertDescription>{wordError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            {wordDownloadUrl ? (
              <a href={wordDownloadUrl} download={wordFileName}>
                <Button className="w-full">
                  <FileDown className="mr-2 h-4 w-4" />
                  Download {wordFileName}
                </Button>
              </a>
            ) : (
              <div className="text-sm text-muted-foreground">
                No file yet. Run a conversion to generate your `.docx`.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        remainingConversions={remainingConversions}
        dailyLimit={dailyLimit}
      />

      {paywallEnabled && isSignedIn && (
        <div className="flex justify-end mb-4">
          <UsageIndicator onUpgradeClick={() => setShowUpgradeModal(true)} />
        </div>
      )}

      <TabsComponent
        activeTool={activeTool}
        onToolChange={(tool) => {
          setActiveTool(tool);
          track("tab_switched", {
            from_tab: "tools",
            to_tab: tool,
          });
        }}
        onToolClick={(toolName) => {
          track("tool_clicked", {
            tool_name: toolName,
            url: "internal",
          });
        }}
      />

      {activeTool === "text" && renderTextTool()}
      {activeTool === "image-to-latex" && renderImageTool()}
      {activeTool === "latex-to-word" && renderWordTool()}

      {activeTool === "text" && (
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
                text. It handles both simple expressions like &quot;x squared&quot; and complex multi-line equations.
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
                No! That&apos;s the whole point. Just describe your equation in plain English or type it
                naturally (like &quot;integral from 0 to infinity of e to the negative x squared dx&quot;),
                and we&apos;ll generate the proper LaTeX syntax for you.
              </p>
            </details>
          </div>
        </section>
      )}
    </div>
  );
}
