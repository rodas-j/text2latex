import type { MetaFunction } from "@remix-run/node";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Header } from "~/components/Header";
import { InputSection } from "~/components/InputSection";
import { OutputSection } from "~/components/OutputSection";
import { BottomActions } from "~/components/BottomActions";
import { TabsComponent } from "~/components/TabsComponent";
import { AlertCircle } from "lucide-react";
import { usePostHog } from "posthog-js/react";
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
  const posthog = usePostHog();
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
    if (text.length > 5000) {
      setIsTextLong(true);
      posthog?.capture("text_too_long", {
        textLength: text.length,
      });
      return;
    }
    setIsTextLong(false);
    setErrorText("");
    setLoading(true);

    try {
      const result = await convertToLatex({ text });
      setLatex(result.data);
      setLastConversionId(result.conversionId);
      posthog?.capture("latex_conversion_success", {
        inputLength: text.length,
        outputLength: result.data.length,
      });
    } catch (error) {
      setErrorText("Failed to convert text. Please try again.");
      posthog?.capture("latex_conversion_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
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
