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
import { useClerk } from "@clerk/remix";

interface StarButtonProps {
  conversionId: Id<"conversions">;
}

export function StarButton({ conversionId }: StarButtonProps) {
  const { user } = useClerk();
  const isFavorited = useQuery(api.conversions.isFavorited, { conversionId });
  const toggleFavorite = useMutation(api.conversions.toggleFavorite);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async () => {
    if (!user) {
      return;
    }
    await toggleFavorite({ conversionId });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="lg"
            className="relative hover:bg-accent p-3"
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={!user}
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                isFavorited ? "fill-yellow-400 text-yellow-400" : ""
              } ${isHovered && !isFavorited ? "text-yellow-400" : ""}`}
            />
            <span className="sr-only">
              {isFavorited ? "Remove from favorites" : "Add to favorites"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {user
            ? isFavorited
              ? "Remove from favorites"
              : "Add to favorites"
            : "Sign in to use favorites"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
