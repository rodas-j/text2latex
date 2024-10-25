import { Link } from "@remix-run/react";
import { ModeToggle } from "~/components/mode-toggle";

export function Header() {
  return (
    <>
      <div className="flex justify-between items-center p-3 border-b">
        <Link to="/">
          <h1 className="text-2xl font-semibold">Text2LaTex</h1>
        </Link>
        <ModeToggle />
      </div>
    </>
  );
}
