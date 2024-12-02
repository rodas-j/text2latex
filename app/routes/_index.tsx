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

  async function transcribe(text: string) {
    try {
      const apiUrl = import.meta.env.VITE_TEXT2LATEX_URL;
      if (!apiUrl) {
        throw new Error("VITE_TEXT2LATEX_URL is not defined");
      }
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  }

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
      const latexResult = await transcribe(text);
      setLatex(latexResult);
      posthog?.capture("latex_conversion_success", {
        inputLength: text.length,
        outputLength: latexResult.length,
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
      {isTextLong && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Text is too long</AlertDescription>
        </Alert>
      )}

      {errorText && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorText}</AlertDescription>
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
        />
        <OutputSection latex={latex} copied={copied} setCopied={setCopied} />
      </div>

      {/* <BottomActions /> */}
    </div>
  );
}
