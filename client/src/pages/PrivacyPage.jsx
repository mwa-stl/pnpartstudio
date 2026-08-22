import React from "react";
import LegalLayout, { Section, Bullets, InlineLink, Note } from "../components/LegalLayout";

const LAST_UPDATED = "August 28, 2025";

const PrivacyPage = () => (
  <LegalLayout
    title="Privacy Policy"
    lastUpdated={LAST_UPDATED}
    intro="This Privacy Policy explains how PnP Artstudio collects, uses, discloses, and protects personal information when you visit or make a purchase from our website."
  >
    <Section title="1. Information we collect">
      <Bullets items={[
        "Contact details (name, email, phone, shipping and billing addresses)",
        "Order details (items purchased, prices, transaction data)",
        "Account and preference information if you create an account",
        "Technical data (IP address, device, browser, cookies)",
      ]} />
    </Section>

    <Section title="2. How we use information">
      <Bullets items={[
        "To process orders, payments, shipping, and customer support",
        "To personalise content, improve services, and prevent fraud",
        "To send transactional email; marketing only with consent or as permitted",
      ]} />
    </Section>

    <Section title="3. Cookies & similar technologies">
      <p>
        We use cookies and similar tools to improve site performance and user experience. Your
        browser settings can be adjusted to refuse cookies, which may affect site functionality.
      </p>
    </Section>

    <Section title="4. Sharing of information">
      <p>
        We may share information with service providers that assist with payments, shipping,
        analytics, or marketing. We do not sell personal information.
      </p>
    </Section>

    <Section title="5. Data retention">
      <p>
        We retain personal information for as long as necessary to fulfil the purposes outlined in
        this policy, unless a longer retention period is required by law.
      </p>
    </Section>

    <Section title="6. Security">
      <p>
        We implement reasonable technical and organisational measures to safeguard personal
        information. However, no method of transmission or storage is 100% secure.
      </p>
    </Section>

    <Section title="7. Children’s privacy">
      <p>
        Our services are not directed to children under the age applicable by local law. We do not
        knowingly collect personal data from children.
      </p>
    </Section>

    <Section title="8. International transfers">
      <p>
        Personal information may be transferred and processed outside your country. Steps are taken
        to ensure an adequate level of data protection where required.
      </p>
    </Section>

    <Section title="9. Your rights">
      <p>
        Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict
        processing of your personal data. Requests can be sent to{" "}
        <InlineLink href="mailto:pnp.artstudio7@gmail.com">pnp.artstudio7@gmail.com</InlineLink>.
      </p>
    </Section>

    <Section title="10. Changes to this policy">
      <p>
        We may update this Privacy Policy periodically. Continued use after updates indicates
        acceptance of the revised policy.
      </p>
    </Section>

    <Section title="11. Contact">
      <p>
        For privacy questions, contact{" "}
        <InlineLink href="mailto:pnp.artstudio7@gmail.com">pnp.artstudio7@gmail.com</InlineLink> or
        use the <InlineLink to="/contact">Contact</InlineLink> page.
      </p>
    </Section>

    <Note>
      This template is provided for general informational purposes and may require updates to
      comply with local privacy regulations.
    </Note>
  </LegalLayout>
);

export default PrivacyPage;
