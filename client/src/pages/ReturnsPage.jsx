import React from "react";
import LegalLayout, { Section, Bullets, InlineLink, Note } from "../components/LegalLayout";

const LAST_UPDATED = "August 28, 2025";

const ReturnsPage = () => (
  <LegalLayout
    title="Returns & Refunds"
    lastUpdated={LAST_UPDATED}
    intro="Every piece is made and packed by hand. If something isn’t right, here’s exactly how we’ll put it right."
  >
    <Section title="Return window">
      <p>
        Returns are accepted within 7 days of delivery for eligible items. To be eligible, the item
        must be unused, in original condition, and in its original packaging.
      </p>
    </Section>

    <Section title="Non-returnable items">
      <Bullets items={[
        "Custom orders and commissions",
        "Digital downloads",
        "Gift cards",
        "Final sale or clearance items (where marked)",
      ]} />
    </Section>

    <Section title="Return process">
      <Bullets
        ordered
        items={[
          <>Email a return request with your order number and reason to{" "}
            <InlineLink href="mailto:pnp.artstudio7@gmail.com">pnp.artstudio7@gmail.com</InlineLink>.</>,
          "Wait for return authorisation and instructions.",
          "Pack securely and ship using a trackable method within 5 days of authorisation.",
        ]}
      />
    </Section>

    <Section title="Refunds">
      <p>
        Once received and inspected, approved refunds are issued to the original payment method
        within 5–10 business days. Shipping fees are non-refundable unless the return is due to our
        error or a defective item.
      </p>
    </Section>

    <Section title="Damages & issues">
      <p>
        Please inspect your order upon delivery and contact us within 48 hours if the item is
        defective, damaged, or incorrect. Photos of the packaging and item help us resolve things
        faster.
      </p>
    </Section>

    <Section title="Exchanges">
      <p>
        Exchanges may be possible for equal or higher-value items (price differences apply).
        Contact us for availability and instructions.
      </p>
    </Section>

    <Note>
      For any return questions, email{" "}
      <InlineLink href="mailto:pnp.artstudio7@gmail.com">pnp.artstudio7@gmail.com</InlineLink>.
      Policies may vary for international orders.
    </Note>
  </LegalLayout>
);

export default ReturnsPage;
