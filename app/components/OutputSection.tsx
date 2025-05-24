import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy, Share2, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import Latex from "react-latex-next";
import "katex/dist/katex.min.css";
import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Twitter, Mail } from "lucide-react";
import LatexHighlight from "./LatexHighlight";
import { StarButton } from "./StarButton";
import { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "~/hooks/useAnalytics";

interface OutputSectionProps {
  latex: string;
  input: string;
  copied: boolean;
  setCopied: (copied: boolean) => void;
  lastConversionId?: Id<"conversions">;
}

export function OutputSection({
  latex,
  input,
  copied,
  setCopied,
  lastConversionId,
}: OutputSectionProps) {
  const [liked, setLiked] = React.useState<boolean | null>(null);
  const [activeTab, setActiveTab] = React.useState("preview");
  const { track } = useAnalytics();

  const handleCopy = () => {
    navigator.clipboard.writeText(latex);

    track("output_copied", {
      output_length: latex.length,
      copy_method: "button",
    });

    if (!copied) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTabChange = (newTab: string) => {
    track("tab_switched", {
      from_tab: activeTab,
      to_tab: newTab,
    });
    setActiveTab(newTab);
  };

  const handleLike = (isLiked: boolean) => {
    track("feedback_submitted", {
      rating: isLiked ? 5 : 1,
      has_comment: false,
    });
    setLiked(isLiked);
  };

  const handleShare = (platform: "twitter" | "email") => {
    track("external_link_clicked", {
      url: platform === "twitter" ? "https://twitter.com" : "mailto:",
      link_text: `Share via ${platform}`,
      location: "output_section",
    });

    if (platform === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(latex)}`,
        "_blank"
      );
    } else {
      window.location.href = `mailto:?body=${encodeURIComponent(latex)}`;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsContent value="preview" className="mt-0">
          <div className="border rounded-md p-4 min-h-[30vh] max-h-[30vh] overflow-auto">
            <Latex>{latex}</Latex>
          </div>
        </TabsContent>

        <TabsContent value="code" className="mt-0">
          <div className="border rounded-md p-4 min-h-[30vh] max-h-[30vh] bg-[#18181B] text-white overflow-auto">
            <LatexHighlight code={latex} />
          </div>
        </TabsContent>
        <TabsList className="mb-4 flex justify-between">
          <div>
            <TabsTrigger
              value="preview"
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-gray-200"
              title="View the preview"
            >
              Preview
            </TabsTrigger>
            <TabsTrigger
              value="code"
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-gray-200"
              title="View the code"
            >
              Code
            </TabsTrigger>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <StarButton
                input={input}
                output={latex}
                conversionId={lastConversionId}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleLike(true)}
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
                onClick={() => handleLike(false)}
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
                      onClick={() => handleShare("twitter")}
                    >
                      <Twitter className="h-4 w-4 mr-2" />
                      Twitter
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleShare("email")}
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
