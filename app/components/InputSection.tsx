import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputSectionProps {
  text: string;
  setText: (text: string) => void;
  handleTranscribe: () => void;
  loading: boolean;
  isTextLong: boolean;
}

export function InputSection({
  text,
  setText,
  handleTranscribe,
  loading,
  isTextLong,
}: InputSectionProps) {
  const exampleInput = `limit n->0 (5^n/n^2)`;
  const example2Input = `sum from 1 to n of n/2`;
  const example3Input = `integral of x^2 + 2x + 1 from 0 to 1`;

  return (
    <div className="space-y-4">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Write normal text here... \n${exampleInput} \n${example2Input} \n${example3Input}`}
        className={cn(
          "min-h-[30vh] resize-none focus:outline-none",
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
  );
}
