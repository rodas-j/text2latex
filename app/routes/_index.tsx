import type { MetaFunction } from "@remix-run/node";
import { ModeToggle } from "~/components/mode-toggle";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Clock } from "lucide-react";
import Latex from "react-latex-next";
import "katex/dist/katex.min.css";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Star, Share2, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Footer } from "~/components/Footer";

export const meta: MetaFunction = () => {
  return [
    { title: "Text2Latex" },
    { name: "description", content: "Convert text to LaTeX" },
  ];
};

export default function Index() {
  const [copied, setCopied] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isTextLong, setIsTextLong] = useState(false);
  const [text, setText] = useState("");
  const [latex, setLatex] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRender, setIsRender] = useState(false);

  // Example inputs/outputs
  const exampleInput = `limit n->0 (5^n/n^2)`;
  const example2Input = `sum from 1 to n of n/2`;
  const example3Input = `integral of x^2 + 2x + 1 from 0 to 1`;

  const exampleOutput = `\\lim_{n\\to 0} \\frac{5^n}{n^2}`;
  const example2Output = `\\sum_{n=1}^n \\frac{n}{2}`;
  const example3Output = "\\int_{0}^{1} (x^2 + 2x + 1) , dx";

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
    if (text.length > 500) {
      setIsTextLong(true);
      return;
    }
    setIsTextLong(false);
    setErrorText("");
    setLoading(true);

    try {
      const latexResult = await transcribe(text);
      setLatex(latexResult);
    } catch (error) {
      setErrorText("Failed to convert text. Please try again.");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRender = () => setIsRender(!isRender);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Text2LaTex</h1>
        <ModeToggle />
      </div>

      <Tabs defaultValue="text" className="mb-6">
        <TabsList>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="documents" disabled>
            Documents
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isTextLong && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>Text is too long</AlertDescription>
        </Alert>
      )}

      {errorText && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorText}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Write normal text here... \n${exampleInput} \n${example2Input} \n${example3Input}`}
            className={cn(
              "min-h-[176px] resize-none focus:outline-none",
              isTextLong && "border-destructive"
            )}
          />
          <div className="flex justify-between items-center">
            <Button size="sm" onClick={handleTranscribe} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transcribe
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Tabs defaultValue="preview" className="w-full">
            <TabsContent value="preview" className="mt-0">
              <div className="border rounded-md p-4 min-h-[176px]">
                <Latex>{latex}</Latex>
              </div>
            </TabsContent>

            <TabsContent value="code" className="mt-0">
              <Textarea
                value={latex}
                readOnly
                className="min-h-[176px] resize-none bg-[#18181B] text-white placeholder:text-gray-400 focus:outline-none"
              />
            </TabsContent>
            <TabsList className="mb-4 flex justify-between">
              <div>
                <TabsTrigger
                  value="preview"
                  className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-gray-200"
                >
                  Preview
                </TabsTrigger>
                <TabsTrigger
                  value="code"
                  className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-gray-200"
                >
                  Code
                </TabsTrigger>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(latex);
                      if (!copied) {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex justify-center gap-8 mt-8">
        <Button variant="ghost" className="flex flex-col items-center gap-2">
          <Star className="h-5 w-5" />
          <span className="text-sm">Saved</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center gap-2">
          <Clock className="h-5 w-5" />
          <span className="text-sm">History</span>
        </Button>
      </div>

      <Footer />
    </div>
  );
}
