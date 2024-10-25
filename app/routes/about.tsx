import { type MetaFunction } from "@remix-run/node";
import { Typography } from "~/components/ui/typography";

export const meta: MetaFunction = () => {
  return [
    { title: "About Text2LaTeX" },
    {
      name: "description",
      content:
        "Learn more about Text2LaTeX, the powerful tool for converting text to LaTeX",
    },
  ];
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Typography.H1>About Text2LaTeX</Typography.H1>

      <Typography.P className="mt-6">
        Welcome to Text2LaTeX, your go-to solution for effortlessly converting
        plain text into beautifully formatted LaTeX code.
      </Typography.P>

      <Typography.H2 className="mt-8">Our Mission</Typography.H2>
      <Typography.P>
        At Text2LaTeX, we're passionate about making LaTeX accessible to
        everyone. Our mission is to simplify the process of creating
        professional-looking documents, papers, and presentations by providing a
        user-friendly interface for LaTeX conversion.
      </Typography.P>

      <Typography.H2 className="mt-8">How It Works</Typography.H2>
      <Typography.P>
        Our advanced AI-powered engine analyzes your input text and
        intelligently converts it into properly formatted LaTeX code. Whether
        you're working on complex mathematical equations, scientific papers, or
        simple documents, Text2LaTeX has got you covered.
      </Typography.P>

      <Typography.H2 className="mt-8">Key Features</Typography.H2>
      <ul className="list-disc list-inside mt-4 space-y-2">
        <Typography.Li>Instant text to LaTeX conversion</Typography.Li>
        <Typography.Li>
          Support for mathematical equations and symbols
        </Typography.Li>
        <Typography.Li>Customizable output options</Typography.Li>
        <Typography.Li>User-friendly interface</Typography.Li>
        <Typography.Li>Real-time preview of LaTeX output</Typography.Li>
      </ul>

      <Typography.H2 className="mt-8">Get Started</Typography.H2>
      <Typography.P>
        Ready to streamline your LaTeX workflow? Head over to our home page and
        start converting your text to LaTeX today. It's free, fast, and
        incredibly easy to use!
      </Typography.P>

      <Typography.P className="mt-4">
        If you have any questions or feedback, don't hesitate to reach out to
        our support team. We're here to help you make the most of Text2LaTeX.
      </Typography.P>
    </div>
  );
}
