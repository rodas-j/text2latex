import { Typography } from "~/components/ui/typography";

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-12">
      <Typography.H1>Privacy Policy</Typography.H1>

      <Typography.P>
        Last updated: {new Date().toLocaleDateString()}
      </Typography.P>

      <Typography.H2>Information We Collect</Typography.H2>
      <Typography.P>
        We collect information you provide directly to us when using our
        services. This may include:
      </Typography.P>
      <ul className="ml-6 list-disc">
        <Typography.Li>Name and contact information</Typography.Li>
        <Typography.Li>Account credentials</Typography.Li>
        <Typography.Li>Payment information</Typography.Li>
        <Typography.Li>Usage data and preferences</Typography.Li>
      </ul>

      <Typography.H2>How We Use Your Information</Typography.H2>
      <Typography.P>We use the information we collect to:</Typography.P>
      <ul className="ml-6 list-disc">
        <Typography.Li>Provide and maintain our services</Typography.Li>
        <Typography.Li>Process your transactions</Typography.Li>
        <Typography.Li>
          Send you important updates and notifications
        </Typography.Li>
        <Typography.Li>
          Improve our services and develop new features
        </Typography.Li>
      </ul>

      <Typography.H2>Data Security</Typography.H2>
      <Typography.P>
        We implement appropriate security measures to protect your personal
        information. However, no method of transmission over the Internet is
        100% secure, and we cannot guarantee absolute security.
      </Typography.P>

      <Typography.H2>Contact Us</Typography.H2>
      <Typography.P>
        If you have any questions about this Privacy Policy, please contact us
        at:
      </Typography.P>
      <Typography.P>
        Email: privacy@example.com
        <br />
        Address: 123 Privacy Street, Security City, 12345
      </Typography.P>
    </div>
  );
}
