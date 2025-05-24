import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { History, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { useClerk, SignInButton } from "@clerk/remix";
import { useAnalytics } from "~/hooks/useAnalytics";

interface ConversionItem {
  _id: string;
  input: string;
  output: string;
  createdAt: number;
}

interface ConversionDrawerProps {
  onSelect: (input: string, output: string) => void;
}

export function ConversionDrawer({ onSelect }: ConversionDrawerProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const { user } = useClerk();
  const { track } = useAnalytics();

  const history = useQuery(api.conversions.getHistory);
  const favorites = useQuery(api.conversions.getFavorites);

  const handleSelect = (
    item: ConversionItem,
    source: "history" | "favorites"
  ) => {
    track("history_item_selected", {
      item_index: 0, // Could be enhanced with actual index
      input_length: item.input.length,
      output_length: item.output.length,
    });

    onSelect(item.input, item.output);
    setIsHistoryOpen(false);
    setIsFavoritesOpen(false);
  };

  const handleHistoryOpen = () => {
    if (!user) {
      track("auth_sign_in_started", {
        method: "history_access",
      });
      return;
    }

    track("history_opened", {
      has_history: Boolean(history && history.length > 0),
      history_count: history?.length || 0,
    });
    setIsHistoryOpen(true);
  };

  const handleFavoritesOpen = () => {
    if (!user) {
      track("auth_sign_in_started", {
        method: "favorites_access",
      });
      return;
    }

    track("history_opened", {
      has_history: Boolean(favorites && favorites.length > 0),
      history_count: favorites?.length || 0,
    });
    setIsFavoritesOpen(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex gap-4">
      <Dialog
        open={isHistoryOpen}
        onOpenChange={(open) => {
          if (!user && open) {
            return;
          }
          setIsHistoryOpen(open);
        }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {user ? (
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="relative hover:bg-accent p-3 [&_svg]:!w-6 [&_svg]:!h-6"
                    onClick={handleHistoryOpen}
                  >
                    <History className="h-6 w-6" />
                    <span className="sr-only">View history</span>
                  </Button>
                </DialogTrigger>
              ) : (
                <SignInButton mode="modal">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="relative hover:bg-accent p-3 [&_svg]:!w-6 [&_svg]:!h-6"
                    onClick={handleHistoryOpen}
                  >
                    <History className="h-6 w-6" />
                    <span className="sr-only">View history</span>
                  </Button>
                </SignInButton>
              )}
            </TooltipTrigger>
            <TooltipContent>
              {user ? "View history" : "Sign in to view history"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>History</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {history?.map((item: ConversionItem) => (
              <div
                key={item._id}
                className="rounded-lg border p-4 hover:bg-accent cursor-pointer"
                onClick={() => handleSelect(item, "history")}
              >
                <div className="font-medium">{item.input}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {item.output}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {formatDate(item.createdAt)}
                </div>
              </div>
            ))}
            {history?.length === 0 && (
              <div className="text-center text-muted-foreground">
                No history yet
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFavoritesOpen}
        onOpenChange={(open) => {
          if (!user && open) {
            return;
          }
          setIsFavoritesOpen(open);
        }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {user ? (
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="relative hover:bg-accent p-3 [&_svg]:!w-6 [&_svg]:!h-6"
                    onClick={handleFavoritesOpen}
                  >
                    <Star className="h-6 w-6" />
                    <span className="sr-only">View favorites</span>
                  </Button>
                </DialogTrigger>
              ) : (
                <SignInButton mode="modal">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="relative hover:bg-accent p-3 [&_svg]:!w-6 [&_svg]:!h-6"
                    onClick={handleFavoritesOpen}
                  >
                    <Star className="h-6 w-6" />
                    <span className="sr-only">View favorites</span>
                  </Button>
                </SignInButton>
              )}
            </TooltipTrigger>
            <TooltipContent>
              {user ? "View favorites" : "Sign in to view favorites"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Favorites</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {favorites
              ?.filter((item): item is ConversionItem => item !== null)
              .map((item: ConversionItem) => (
                <div
                  key={item._id}
                  className="rounded-lg border p-4 hover:bg-accent cursor-pointer"
                  onClick={() => handleSelect(item, "favorites")}
                >
                  <div className="font-medium">{item.input}</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {item.output}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </div>
                </div>
              ))}
            {favorites?.length === 0 && (
              <div className="text-center text-muted-foreground">
                No favorites yet
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
