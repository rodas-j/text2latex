import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useClerk, SignInButton } from "@clerk/remix";

interface StarButtonProps {
  input: string;
  output: string;
  conversionId?: Id<"conversions">;
}

export function StarButton({ input, output, conversionId }: StarButtonProps) {
  const { user } = useClerk();
  const isFavorited = useQuery(
    api.conversions.isFavorited,
    conversionId ? { conversionId } : "skip"
  );
  const toggleFavorite = useMutation(api.conversions.toggleFavorite);
  const saveConversion = useMutation(api.conversions.saveConversion);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async () => {
    if (!user || !output) {
      return;
    }

    try {
      // If we don't have a conversionId, save the conversion first
      let targetId = conversionId;
      if (!targetId) {
        targetId = await saveConversion({ input, output });
      }

      await toggleFavorite({ conversionId: targetId });
    } catch (error) {
      console.error("Error saving/favoriting conversion:", error);
    }
  };

  const buttonContent = (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={!output}
    >
      <Star
        className={`h-4 w-4 transition-colors ${
          isFavorited ? "fill-yellow-400 text-yellow-400" : ""
        } ${isHovered && !isFavorited && output ? "text-yellow-400" : ""}`}
      />
      <span className="sr-only">
        {isFavorited ? "Remove from favorites" : "Add to favorites"}
      </span>
    </Button>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {user ? (
            <div onClick={handleClick}>{buttonContent}</div>
          ) : (
            <SignInButton mode="modal">{buttonContent}</SignInButton>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {!output
            ? "Convert text to LaTeX first"
            : user
            ? isFavorited
              ? "Remove from favorites"
              : "Add to favorites"
            : "Sign in to use favorites"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
