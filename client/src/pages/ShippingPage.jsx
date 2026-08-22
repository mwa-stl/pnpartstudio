import React from "react";
import LegalLayout, { Section, Bullets, InlineLink, Note } from "../components/LegalLayout";

const LAST_UPDATED = "August 28, 2025";

const ShippingPage = () => (
  <LegalLayout
    title="Shipping Policy"
    lastUpdated={LAST_UPDATED}
    intro="How your artwork gets from the studio in Ballwin, Missouri to your wall timings, tracking, and what happens if something goes sideways."
  >
    <Section title="Processing times">
      <p>
        Orders typically process in 2–3 business days. Custom orders may require additional lead
        time, which we&apos;ll confirm with you during purchase.
      </p>
    </Section>

    <Section title="Shipping methods & rates">
      <p>
        We partner with reputable carriers offering standard and expedited options. Shipping rates
        are calculated at checkout based on destination, weight, and service level.
      </p>
    </Section>

    <Section title="Tracking">
      <p>
        Tracking details are emailed once your order ships. Please allow up to 24 hours for carrier
        updates to appear.
      </p>
    </Section>

    <Section title="International shipping">
      <p>
        International orders may be subject to customs duties, taxes, and fees charged by the
        destination country. These charges are the recipient&apos;s responsibility and are not
        included in our prices or shipping rates.
      </p>
    </Section>

    <Section title="Delivery issues">
      <Bullets items={[
        "Undeliverable or incorrect addresses may cause delays or returns",
        "Lost or delayed packages require a carrier investigation before resolution",
        "Weather or carrier disruptions can impact delivery times",
      ]} />
    </Section>

    <Section title="Split shipments">
      <p>
        Orders may be split into multiple shipments to improve handling and delivery times. You
        will receive separate tracking as needed.
      </p>
    </Section>

    <Note>
      Shipping questions? Contact{" "}
      <InlineLink href="mailto:pnp.artstudio7@gmail.com">pnp.artstudio7@gmail.com</InlineLink> and
      we&apos;ll help you out.
    </Note>
  </LegalLayout>
);

export default ShippingPage;
