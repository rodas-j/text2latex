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

  const handleHistorySelect = (input: string, output: string) => {
    setSkipAutoTranslate(true);
    setText(input);
    setLatex(output);
    // Reset skipAutoTranslate after a short delay to allow for future edits to trigger translation
    setTimeout(() => setSkipAutoTranslate(false), 100);
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

      {/* <BottomActions /> */}
    </div>
  );
}
