import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface InputSectionProps {
  text: string;
  setText: (text: string) => void;
  handleTranscribe: () => void;
  loading: boolean;
  isTextLong: boolean;
  output: string;
  lastConversionId?: Id<"conversions">;
}

export function InputSection({
  text,
  setText,
  handleTranscribe,
  loading,
  isTextLong,
  output,
  lastConversionId,
}: InputSectionProps) {
  const exampleInput = `limit n->0 (5^n/n^2)`;
  const example2Input = `sum from 1 to n of n/2`;
  const example3Input = `integral of x^2 + 2x + 1 from 0 to 1`;
  const saveConversion = useMutation(api.conversions.saveConversion);

  // Create a ref to store the timeout ID
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Custom debounce implementation using useEffect and useRef
  useEffect(() => {
    if (text.trim()) {
      // Clear the previous timeout if it exists
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      // Set a new timeout to call handleTranscribe after 750ms
      debounceTimeout.current = setTimeout(() => {
        handleTranscribe();
      }, 1000);
    }

    // Cleanup function to clear the timeout when the component unmounts or before the next effect runs
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [text]); // Re-run the effect when 'text' changes

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  // Save conversion when user copies output
  useEffect(() => {
    const handleCopy = async () => {
      if (text.trim() && output.trim()) {
        await saveConversion({
          input: text,
          output: output,
        });
      }
    };

    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, [text, output, saveConversion]);

  // Save conversion when user clears input
  const handleClear = async () => {
    if (text.trim() && output.trim()) {
      await saveConversion({
        input: text,
        output: output,
      });
    }
    setText("");
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          value={text}
          onChange={handleTextChange}
          placeholder={`Write normal text here... \n${exampleInput} \n${example2Input} \n${example3Input}`}
          className={cn(
            "min-h-[30vh] resize-none focus:outline-none pb-6",
            isTextLong && "border-destructive"
          )}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <span className="text-sm text-gray-500">{text.length}/5000</span>
          {text && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      {loading && (
        <div className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Transcribing...</span>
        </div>
      )}
    </div>
  );
}
