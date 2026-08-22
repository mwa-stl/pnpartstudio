import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Fallback copy for the welcome popup. Live values come from
 * `GET /api/promo-popup` (admin console → Site content → Welcome popup).
 */
export const DEFAULT_PROMO_POPUP = {
  enabled: true,
  delaySeconds: 5,
  image: '',
  imageBadge: 'PnP Artstudio',
  sectionLabel: 'Welcome offer',
  heading: 'Take 10% off your first piece.',
  body: 'Join the studio letter for new work, class dates, and an instant discount.',
  emailLabel: 'Email address',
  emailPlaceholder: 'you@example.com',
  submitLabel: 'Claim discount',
  dismissLabel: 'No thanks',
  footnote: 'You can unsubscribe at any time.',
  successBody: 'Here is your code — it’s also on its way to your inbox.',
  successButtonLabel: 'Start shopping',
  alreadyBody: 'You’ve already claimed a welcome coupon — check your mailbox.',
};

const pick = (v, fallback) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || fallback;
};

const merge = (doc) => {
  if (!doc || typeof doc !== 'object') return DEFAULT_PROMO_POPUP;
  const d = DEFAULT_PROMO_POPUP;
  return {
    // `enabled` is a real switch, so an explicit false must win over the default.
    enabled: doc.enabled !== false,
    delaySeconds: typeof doc.delaySeconds === 'number' ? doc.delaySeconds : d.delaySeconds,
    image: pick(doc.image, ''),
    imageBadge: pick(doc.imageBadge, d.imageBadge),
    sectionLabel: pick(doc.sectionLabel, d.sectionLabel),
    heading: pick(doc.heading, d.heading),
    body: pick(doc.body, d.body),
    emailLabel: pick(doc.emailLabel, d.emailLabel),
    emailPlaceholder: pick(doc.emailPlaceholder, d.emailPlaceholder),
    submitLabel: pick(doc.submitLabel, d.submitLabel),
    dismissLabel: pick(doc.dismissLabel, d.dismissLabel),
    footnote: pick(doc.footnote, d.footnote),
    successBody: pick(doc.successBody, d.successBody),
    successButtonLabel: pick(doc.successButtonLabel, d.successButtonLabel),
    alreadyBody: pick(doc.alreadyBody, d.alreadyBody),
  };
};

/**
 * Welcome popup content, managed in the admin console.
 *
 * Returns `null` until the request settles — the popup must not paint the
 * bundled default copy and then swap it, and must not appear at all if the
 * admin has switched it off.
 */
export default function usePromoPopup() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    axios
      .get(`${API_BASE}/api/promo-popup`, { signal: controller.signal })
      .then(({ data }) => { if (!ignore) setConfig(merge(data)); })
      .catch(() => { if (!ignore) setConfig(DEFAULT_PROMO_POPUP); });

    return () => { ignore = true; controller.abort(); };
  }, []);

  return config;
}
