import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect } from "react";
import debounce from "lodash/debounce";

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

  // Create a debounced version of handleTranscribe
  const debouncedTranscribe = useCallback(debounce(handleTranscribe, 1000), [
    handleTranscribe,
  ]);

  // Effect to trigger transcription when text changes
  useEffect(() => {
    if (text.trim()) {
      debouncedTranscribe();
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={text}
        onChange={handleTextChange}
        placeholder={`Write normal text here... \n${exampleInput} \n${example2Input} \n${example3Input}`}
        className={cn(
          "min-h-[30vh] resize-none focus:outline-none",
          isTextLong && "border-destructive"
        )}
      />
      {loading && (
        <div className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Transcribing...</span>
        </div>
      )}
    </div>
  );
}
