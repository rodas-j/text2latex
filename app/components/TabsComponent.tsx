import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type NativeTool = "text" | "image-to-latex" | "latex-to-word";

const nativeTools: Array<{ value: NativeTool; label: string }> = [
  { value: "text", label: "Text to LaTeX" },
];

interface TabsComponentProps {
  activeTool: NativeTool;
  onToolChange: (tool: NativeTool) => void;
  onToolClick?: (toolName: string) => void;
}

export function TabsComponent({
  activeTool,
  onToolChange,
  onToolClick,
}: TabsComponentProps) {
  return (
    <div className="mb-6 space-y-3">
      <Tabs
        value={activeTool}
        onValueChange={(value) => onToolChange(value as NativeTool)}
      >
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList className="inline-flex w-max">
            {nativeTools.map((tool) => (
              <TabsTrigger
                key={tool.value}
                value={tool.value}
                onClick={() => onToolClick?.(tool.label)}
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-gray-200"
              >
                {tool.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}
