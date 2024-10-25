import { Typography } from "~/components/ui/typography";

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-12">
      <Typography.H1>Privacy Policy</Typography.H1>

      <Typography.P>
        Last updated: {new Date().toLocaleDateString()}
      </Typography.P>

      <Typography.H2>Information Processing</Typography.H2>
      <Typography.P>
        We do not collect or store any personal information. Our service
        utilizes third-party AI services to process your requests. Any data you
        input is only temporarily processed to provide you with the requested
        conversion service.
      </Typography.P>

      <Typography.H2>Third-Party Services</Typography.H2>
      <Typography.P>
        We use external AI services to process your text-to-LaTeX conversion
        requests. Please note that while we don't store your data, the
        processing occurs through these third-party services.
      </Typography.P>

      <Typography.H2>Contact Us</Typography.H2>
      <Typography.P>
        If you have any questions about this Privacy Policy, please contact us
        at: support@text2latex.com
      </Typography.P>
    </div>
  );
}
