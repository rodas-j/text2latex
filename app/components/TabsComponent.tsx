import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";

const AFFILIATE_URL = "https://jenni.ai/?via=text2latex";

const tools = [
  "Image to LaTeX",
  "PDF to LaTeX",
  "Image to TikZ",
  "AI Summarizer",
  "LaTeX to Word",
  "LaTeX to Image",
];

interface TabsComponentProps {
  onToolClick?: (toolName: string) => void;
}

export function TabsComponent({ onToolClick }: TabsComponentProps) {
  const handleToolClick = (toolName: string) => {
    onToolClick?.(toolName);
  };

  return (
    <Tabs defaultValue="text" className="mb-6">
      <div className="overflow-x-auto scrollbar-thin">
        <TabsList className="inline-flex w-max">
          <TabsTrigger
            value="text"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-gray-200"
          >
            Text
          </TabsTrigger>
          {tools.map((tool) => (
            <a
              key={tool}
              href={AFFILIATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleToolClick(tool)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-background/50"
            >
              {tool}
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
