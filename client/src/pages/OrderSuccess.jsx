import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import SuccessLayout from '../components/SuccessLayout';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function OrderSuccess() {
  const q = useQuery();
  const orderId = q.get('orderId') || '';

  const trackHref = `/track-order${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ''}`;

  return (
    <SuccessLayout
      eyebrow="Order Confirmed"
      title="Thank you your order is placed."
      actions={
        <>
          <Link to={trackHref} className="btn-k">Track this order <ArrowUpRight size={13} /></Link>
          <Link to="/shop" className="btn-k btn-k-ghost">Continue shopping</Link>
        </>
      }
    >
      <p className="mb-8 max-w-lg">
        A confirmation email with your receipt is on its way. We&apos;ll let you know as soon as
        your piece ships.
      </p>
      {orderId && (
        <div className="inline-block border border-ink">
          <div className="border-b border-rule px-5 py-2 bg-paper-dim">
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-slate">Order reference</span>
          </div>
          <div className="px-5 py-3.5">
            <code className="font-mono font-medium text-vermillion tracking-[0.18em] text-[1rem]">{orderId}</code>
          </div>
        </div>
      )}
    </SuccessLayout>
  );
}
