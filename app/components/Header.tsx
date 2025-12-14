import { Link } from "@remix-run/react";
import { ModeToggle } from "~/components/mode-toggle";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/remix";
import { Button } from "~/components/ui/button";
import { CreditCard } from "lucide-react";

export function Header() {
  return (
    <>
      <div className="flex justify-between items-center p-3 border-b">
        <Link to="/">
          <h1 className="text-2xl font-semibold">Text2LaTex</h1>
        </Link>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <SignedIn>
            <Link to="/settings/billing">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <CreditCard className="h-4 w-4 mr-1.5" />
                Billing
              </Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline">Sign in</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </>
  );
}
