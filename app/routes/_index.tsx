import type { MetaFunction } from "@remix-run/node";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [copied, setCopied] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isTextLong, setIsTextLong] = useState(false);
  const [text, setText] = useState("");
  const [latex, setLatex] = useState("");
  const [loading, setLoading] = useState(false);
  const [skipAutoTranslate, setSkipAutoTranslate] = useState(false);
  const [lastConversionId, setLastConversionId] = useState<
    Id<"conversions"> | undefined
  >(undefined);

  const convertToLatex = useAction(api.conversions.convertToLatex);

  const handleTranscribe = async () => {
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
    setLoading(true);

    try {
      const result = await withPerformanceTracking(
        () => convertToLatex({ text }),
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

      setErrorText("Failed to convert text. Please try again.");

      track("conversion_failed", {
        input_length: text.length,
        error_message: errorMessage,
        error_type: "api_error",
      });

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
  };

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

  // Helper function to detect input type
  const detectInputType = (input: string): "text" | "math" | "code" => {
    // Simple heuristics to detect input type
    const mathPatterns = /[\$\\\(\)\[\]\{\}\^\_\=\+\-\*\/\<\>]/;
    const codePatterns = /[{};\(\)\[\]]/;

    if (mathPatterns.test(input) && input.includes("$")) return "math";
    if (codePatterns.test(input)) return "code";
    return "text";
  };

  return (
    <div className="container mx-auto p-4">
      {errorText && (
        <Alert variant="destructive" className="mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <div>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorText}</AlertDescription>
            </div>
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
