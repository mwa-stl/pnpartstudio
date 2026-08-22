/**
 * Every page the storefront can link to.
 *
 * Wherever the console asks for a link (slider buttons, page CTAs) it offers
 * this list instead of a free-text path — an admin should not have to know
 * that the commission page lives at `/custom-order`. Keep in step with the
 * <Route> table in `client/src/App.jsx`.
 */
export const CLIENT_ROUTES = [
  { value: '/', label: 'Home', group: 'Main' },
  { value: '/shop', label: 'Shop — all artwork', group: 'Main' },
  { value: '/gallery', label: 'Gallery', group: 'Main' },
  { value: '/art-classes', label: 'Art classes', group: 'Main' },
  { value: '/custom-order', label: 'Custom order / commissions', group: 'Main' },
  { value: '/about', label: 'About the artist', group: 'Main' },
  { value: '/contact', label: 'Contact', group: 'Main' },
  { value: '/blog', label: 'Studio journal (blog)', group: 'Main' },

  { value: '/cart', label: 'Cart', group: 'Shopping' },
  { value: '/wishlist', label: 'Wishlist', group: 'Shopping' },
  { value: '/checkout', label: 'Checkout', group: 'Shopping' },
  { value: '/track-order', label: 'Track an order', group: 'Shopping' },

  { value: '/shop/category/Paintings', label: 'Shop — Paintings', group: 'Shop categories' },
  { value: '/shop/category/Handcrafted Items', label: 'Shop — Handcrafted items', group: 'Shop categories' },

  { value: '/shipping', label: 'Shipping information', group: 'Policies' },
  { value: '/returns', label: 'Returns', group: 'Policies' },
  { value: '/terms', label: 'Terms', group: 'Policies' },
  { value: '/privacy', label: 'Privacy', group: 'Policies' },
];

/** True when a value is one of the known routes (rather than a custom URL). */
export const isKnownRoute = (value) => CLIENT_ROUTES.some((r) => r.value === value);
