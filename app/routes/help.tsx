import { Typography } from "~/components/ui/typography";
import Latex from "react-latex-next";
import "katex/dist/katex.min.css";

export default function FAQPage() {
  return (
    <div className="container max-w-3xl py-12">
      <Typography.H1>Frequently Asked Questions</Typography.H1>

      <Typography.P>
        Get help with common questions about using Text2LaTeX converter.
      </Typography.P>

      <Typography.H2>Basic Usage</Typography.H2>

      <Typography.P>
        <strong>How do I convert text to LaTeX?</strong>
      </Typography.P>
      <Typography.P>
        Simply paste your text into the input field and click "Convert". The
        LaTeX code will appear in the output field. You can then copy and use it
        in your LaTeX document.
      </Typography.P>

      <Typography.H2>Example Conversions</Typography.H2>

      <Typography.P>
        Here are some common expressions and how to write them:
      </Typography.P>

      <div className="space-y-4 my-6">
        <div className="border rounded-lg p-4 bg-muted/50">
          <Typography.P className="font-mono text-sm">
            Input: "square root of x"
          </Typography.P>
          <Typography.P className="font-mono text-sm">
            LaTeX: {"\\sqrt{x}"}
          </Typography.P>
          <Typography.P>
            Renders as: <Latex>{"$\\sqrt{x}$"}</Latex>
          </Typography.P>
        </div>

        <div className="border rounded-lg p-4 bg-muted/50">
          <Typography.P className="font-mono text-sm">
            Input: "integral of x squared dx"
          </Typography.P>
          <Typography.P className="font-mono text-sm">
            LaTeX: {"\\int x^2 dx"}
          </Typography.P>
          <Typography.P>
            Renders as: <Latex>{"$\\int x^2 dx$"}</Latex>
          </Typography.P>
        </div>

        <div className="border rounded-lg p-4 bg-muted/50">
          <Typography.P className="font-mono text-sm">
            Input: "sum from i equals 1 to n"
          </Typography.P>
          <Typography.P className="font-mono text-sm">
            LaTeX: {"\\sum_{i=1}^n"}
          </Typography.P>
          <Typography.P>
            Renders as: <Latex>{"$\\sum_{i=1}^n$"}</Latex>
          </Typography.P>
        </div>

        <div className="border rounded-lg p-4 bg-muted/50">
          <Typography.P className="font-mono text-sm">
            Input: "fraction one over x"
          </Typography.P>
          <Typography.P className="font-mono text-sm">
            LaTeX: {"\\frac{1}{x}"}
          </Typography.P>
          <Typography.P>
            Renders as: <Latex>{"$\\frac{1}{x}$"}</Latex>
          </Typography.P>
        </div>
      </div>

      <Typography.H2>Advanced Examples</Typography.H2>

      <div className="space-y-4 my-6">
        <div className="border rounded-lg p-4 bg-muted/50">
          <Typography.P className="font-mono text-sm">
            Input: "limit as x approaches infinity of one over x"
          </Typography.P>
          <Typography.P className="font-mono text-sm">
            LaTeX: {"\\lim_{x \\to \\infty} \\frac{1}{x}"}
          </Typography.P>
          <Typography.P>
            Renders as: <Latex>{"$\\lim_{x \\to \\infty} \\frac{1}{x}$"}</Latex>
          </Typography.P>
        </div>

        <div className="border rounded-lg p-4 bg-muted/50">
          <Typography.P className="font-mono text-sm">
            Input: "integral from zero to infinity of e to the minus x dx"
          </Typography.P>
          <Typography.P className="font-mono text-sm">
            LaTeX: {"\\int_0^{\\infty} e^{-x} dx"}
          </Typography.P>
          <Typography.P>
            Renders as: <Latex>{"$\\int_0^{\\infty} e^{-x} dx$"}</Latex>
          </Typography.P>
        </div>
      </div>

      <Typography.H2>Tips for Better Results</Typography.H2>

      <ul className="ml-6 list-disc">
        <Typography.Li>Use clear, natural language</Typography.Li>
        <Typography.Li>
          Specify mathematical terms explicitly (e.g., "squared" instead of "²")
        </Typography.Li>
        <Typography.Li>
          Break complex expressions into smaller parts
        </Typography.Li>
        <Typography.Li>
          Review the output and make adjustments if needed
        </Typography.Li>
      </ul>

      <Typography.H2>Common Issues</Typography.H2>

      <Typography.P>
        <strong>Why isn't my expression converting correctly?</strong>
      </Typography.P>
      <Typography.P>
        Try to be as clear and specific as possible. Here are some examples of
        good vs bad inputs:
      </Typography.P>

      <div className="border rounded-lg p-4 bg-muted/50 my-4">
        <Typography.P>❌ Bad: "x2"</Typography.P>
        <Typography.P>
          ✅ Good: "x squared" or "x to the power of 2"
        </Typography.P>
        <Typography.P>
          Renders as: <Latex>{"$x^2$"}</Latex>
        </Typography.P>
      </div>

      <Typography.H2>Still Need Help?</Typography.H2>

      <Typography.P>If you're still having trouble, you can:</Typography.P>
      <ul className="ml-6 list-disc">
        <Typography.Li>Check our detailed documentation</Typography.Li>
        <Typography.Li>Join our community Discord server</Typography.Li>
        <Typography.Li>Submit a support ticket</Typography.Li>
        <Typography.Li>Email us at support@text2latex.com</Typography.Li>
      </ul>
    </div>
  );
}
