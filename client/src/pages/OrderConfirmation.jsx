import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import SuccessLayout from '../components/SuccessLayout';

export default function OrderConfirmation() {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setConfirmed(true), 1700);
    return () => clearTimeout(timer);
  }, []);

  if (!confirmed) {
    return (
      <div className="min-h-[80vh] flex items-center bg-paper px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1100px] mx-auto w-full">
          <div className="max-w-2xl">
            <div className="section-index mb-8">Processing</div>
            <h1 className="t-display mb-6" aria-live="polite">Confirming your payment…</h1>
            <p className="text-graphite mb-10">This only takes a moment. Please don&apos;t close this window.</p>
            <div className="h-[2px] w-full bg-rule overflow-hidden">
              <span className="confirm-bar" />
            </div>
          </div>
        </div>
        <style>{`
          .confirm-bar {
            display: block;
            height: 100%;
            width: 35%;
            background: var(--color-vermillion);
            animation: confirm-slide 1.4s cubic-bezier(.5,0,.5,1) infinite;
          }
          @keyframes confirm-slide {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(340%); }
          }
          @media (prefers-reduced-motion: reduce) { .confirm-bar { animation: none; width: 100%; } }
        `}</style>
      </div>
    );
  }

  return (
    <SuccessLayout
      eyebrow="Payment Received"
      title="Thank you we’ve got your payment."
      actions={
        <>
          <Link to="/track-order" className="btn-k">Track your order <ArrowUpRight size={13} /></Link>
          <Link to="/shop" className="btn-k btn-k-ghost">Continue shopping</Link>
        </>
      }
    >
      <p className="max-w-lg">Your receipt will arrive by email once the payment finishes confirming.</p>
    </SuccessLayout>
  );
}
