import { Button } from "@/components/ui/button";
import { Star, Clock } from "lucide-react";

export function BottomActions() {
  return (
    <div className="flex justify-center gap-8 mt-8">
      <Button variant="ghost" className="flex flex-col items-center gap-2">
        <Star className="h-5 w-5" />
        <span className="text-sm">Saved</span>
      </Button>
      <Button variant="ghost" className="flex flex-col items-center gap-2">
        <Clock className="h-5 w-5" />
        <span className="text-sm">History</span>
      </Button>
    </div>
  );
}
