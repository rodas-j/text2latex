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
import { useClerk } from "@clerk/remix";

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

  const history = useQuery(api.conversions.getHistory);
  const favorites = useQuery(api.conversions.getFavorites);

  const handleSelect = (item: ConversionItem) => {
    onSelect(item.input, item.output);
    setIsHistoryOpen(false);
    setIsFavoritesOpen(false);
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
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="lg"
                  className="relative hover:bg-accent p-3 [&_svg]:!w-6 [&_svg]:!h-6"
                  onClick={() => {
                    if (!user) {
                      return;
                    }
                  }}
                >
                  <History className="h-6 w-6" />
                  <span className="sr-only">View history</span>
                </Button>
              </DialogTrigger>
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
                onClick={() => handleSelect(item)}
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

      <Dialog open={isFavoritesOpen} onOpenChange={setIsFavoritesOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="lg"
                  className="relative hover:bg-accent p-3 [&_svg]:!w-6 [&_svg]:!h-6"
                  onClick={() => {
                    if (!user) {
                      return;
                    }
                  }}
                >
                  <Star className="h-6 w-6" />
                  <span className="sr-only">View favorites</span>
                </Button>
              </DialogTrigger>
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
            {favorites?.map((item: ConversionItem) => (
              <div
                key={item._id}
                className="rounded-lg border p-4 hover:bg-accent cursor-pointer"
                onClick={() => handleSelect(item)}
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
