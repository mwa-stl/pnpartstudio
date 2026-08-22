import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import SuccessLayout from "../components/SuccessLayout";

const StorePickupSuccessPage = () => (
  <SuccessLayout
    eyebrow="Pickup Reserved"
    title="Your pickup order is confirmed."
    actions={
      <>
        <Link to="/shop" className="btn-k">Keep browsing <ArrowUpRight size={13} /></Link>
        <Link to="/" className="btn-k btn-k-ghost">Back to home</Link>
      </>
    }
  >
    <p className="mb-8 max-w-lg">
      Thank you for your order. Our team will be in touch shortly to confirm your pickup
      time and studio details.
    </p>
    <div className="border-t border-rule pt-5 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-slate leading-relaxed">
      579 Brook Meadow Dr, Ballwin, MO 63021<br />
      Mon–Fri 9am–6pm
    </div>
  </SuccessLayout>
);

export default StorePickupSuccessPage;
