import { ModeToggle } from "~/components/mode-toggle";

export function Header() {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Text2LaTex</h1>
        <ModeToggle />
      </div>
    </>
  );
}
