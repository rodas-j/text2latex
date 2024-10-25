import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy, Star, Share2, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import Latex from "react-latex-next";
import "katex/dist/katex.min.css";
import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Twitter, Mail } from "lucide-react";

interface OutputSectionProps {
  latex: string;
  copied: boolean;
  setCopied: (copied: boolean) => void;
}

export function OutputSection({
  latex,
  copied,
  setCopied,
}: OutputSectionProps) {
  const [liked, setLiked] = React.useState<boolean | null>(null);

  return (
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
              {/* <Button variant="ghost" size="icon">
                <Star className="h-4 w-4" />
              </Button> */}
              <Button
                variant="ghost"
                size="icon"
                disabled={!latex.trim()}
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
              <Button
                variant="ghost"
                size="icon"
                disabled={!latex.trim()}
                onClick={() => setLiked(true)}
                className={liked === true ? "text-green-500" : ""}
              >
                <ThumbsUp
                  className={`h-4 w-4 ${
                    liked === true ? "stroke-current" : ""
                  }`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={!latex.trim()}
                onClick={() => setLiked(false)}
                className={liked === false ? "text-red-500" : ""}
              >
                <ThumbsDown
                  className={`h-4 w-4 ${
                    liked === false ? "stroke-current" : ""
                  }`}
                />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={!latex.trim()}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="end" side="bottom">
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        window.open(
                          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                            latex
                          )}`,
                          "_blank"
                        );
                      }}
                    >
                      <Twitter className="h-4 w-4 mr-2" />
                      Twitter
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        window.location.href = `mailto:?body=${encodeURIComponent(
                          latex
                        )}`;
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </TabsList>
      </Tabs>
    </div>
  );
}
