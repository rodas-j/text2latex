import { Link } from "@remix-run/react";

export function Footer() {
  return (
    <footer className="mt-8 border-t py-4">
      <div className="container mx-auto px-4">
        <nav className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <Link to="/about" className="hover:underline">
            About Text2LaTex
          </Link>
          <Link to="/privacy" className="hover:underline">
            Privacy & Terms
          </Link>
          <Link to="/help" className="hover:underline">
            Help
          </Link>
          <a href="mailto:support@text2latex.com" className="hover:underline">
            Send feedback
          </a>
        </nav>
      </div>
    </footer>
  );
}
