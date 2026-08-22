import React from "react";
import LegalLayout, { Section, Bullets, InlineLink, Note } from "../components/LegalLayout";

const LAST_UPDATED = "August 28, 2025";

const TermsPage = () => (
  <LegalLayout
    title="Terms & Conditions"
    lastUpdated={LAST_UPDATED}
    intro="Please read these Terms & Conditions carefully before using the PnP Artstudio website and services. By accessing or using our site, you agree to be bound by these Terms. If you disagree with any part, please discontinue use of the services."
  >
    <Section title="1. Eligibility & accounts">
      <p>
        To place orders, you may be required to create an account. You agree to provide accurate
        information and are responsible for maintaining the confidentiality of your login
        credentials and for all activity under your account.
      </p>
    </Section>

    <Section title="2. Orders, pricing & availability">
      <p>
        All orders are subject to acceptance and availability. Prices may change without notice.
        If an error in pricing or product details occurs, PnP Artstudio may cancel or adjust the
        order after notifying you.
      </p>
    </Section>

    <Section title="3. Payments">
      <p>
        Accepted payment methods are displayed at checkout. By submitting payment information you
        represent that you are authorised to use the selected method, and you authorise charges
        for the order total including taxes and shipping.
      </p>
    </Section>

    <Section title="4. Shipping & delivery">
      <p>
        Processing times and delivery estimates are outlined on our{" "}
        <InlineLink to="/shipping">Shipping</InlineLink> page. Risk of loss transfers upon delivery
        by the carrier to the address you provide.
      </p>
    </Section>

    <Section title="5. Returns & refunds">
      <p>
        Our return windows, conditions, and exclusions are described on the{" "}
        <InlineLink to="/returns">Returns</InlineLink> page. Custom orders and digital items are
        typically non-returnable.
      </p>
    </Section>

    <Section title="6. Intellectual property">
      <p>
        All artworks, images, logos, and content on this site are owned by or licensed to PnP
        Artstudio and protected by applicable laws. You may not reproduce, distribute, or create
        derivative works without prior written consent.
      </p>
    </Section>

    <Section title="7. User content & reviews">
      <p>
        By submitting reviews or content, you grant PnP Artstudio a non-exclusive, royalty-free
        licence to use, reproduce, and display such content in connection with the services.
      </p>
    </Section>

    <Section title="8. Prohibited uses">
      <p>You agree not to:</p>
      <Bullets items={[
        "Violate laws or infringe third-party rights",
        "Interfere with site security or functionality",
        "Upload malicious code or spam",
        "Misrepresent identity or purchase information",
      ]} />
    </Section>

    <Section title="9. Disclaimer & limitation of liability">
      <p>
        The services are provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest
        extent permitted by law, PnP Artstudio disclaims all warranties and is not liable for
        indirect or consequential damages.
      </p>
    </Section>

    <Section title="10. Indemnification">
      <p>
        You agree to indemnify and hold PnP Artstudio harmless from claims arising out of your
        violation of these Terms or misuse of the services.
      </p>
    </Section>

    <Section title="11. Governing law">
      <p>
        These Terms are governed by the laws of your local jurisdiction unless otherwise required
        by applicable law. Venue and jurisdiction shall be as permitted by law.
      </p>
    </Section>

    <Section title="12. Changes to terms">
      <p>
        We may update these Terms from time to time. Continued use after changes become effective
        constitutes acceptance of the revised Terms.
      </p>
    </Section>

    <Section title="13. Contact">
      <p>
        Questions about these Terms can be sent to{" "}
        <InlineLink href="mailto:pnp.artstudio7@gmail.com">pnp.artstudio7@gmail.com</InlineLink>.
      </p>
    </Section>

    <Note>
      This page provides general information and does not constitute legal advice. Consider
      consulting a qualified attorney to tailor these terms to your specific business needs.
    </Note>
  </LegalLayout>
);

export default TermsPage;
