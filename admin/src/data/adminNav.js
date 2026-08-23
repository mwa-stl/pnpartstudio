/**
 * The console's navigation, and the single source of its numbering.
 *
 * The index shown in the sidebar, the topbar and each page's eyebrow all come
 * from this list, so adding a page in the middle renumbers everything at once
 * instead of leaving three places to drift apart by hand.
 */
export const NAV_GROUPS = [
  {
    label: "Catalogue",
    links: [
      { to: "/admin/categories", label: "Categories" },
      { to: "/admin/products", label: "Products" },
      { to: "/admin/classes", label: "Classes" },
      { to: "/admin/gallery", label: "Gallery" },
      { to: "/admin/reviews", label: "Reviews" },
    ],
  },
  {
    label: "Sales",
    links: [
      { to: "/admin/orders", label: "Orders" },
      { to: "/admin/store-pickup-orders", label: "Store pickup" },
      { to: "/admin/coupons", label: "Coupons" },
    ],
  },
  {
    label: "Site content",
    links: [
      { to: "/admin/hero-sliders", label: "Home sliders" },
      { to: "/admin/artist-profile", label: "Artist profile" },
      { to: "/admin/contact-details", label: "Contact details" },
      { to: "/admin/page-mastheads", label: "Page mastheads" },
      { to: "/admin/welcome-popup", label: "Welcome popup" },
      { to: "/admin/testimonials", label: "Testimonials" },
      { to: "/admin/newsletters", label: "Newsletters" },
    ],
  },
  {
    label: "Tools",
    links: [
      { to: "/admin/bulk-watermark", label: "Bulk watermark" },
    ],
  },
];

/** Flat lookup: path → { n, label, group }. Numbering runs across all groups. */
export const NAV_INDEX = (() => {
  const map = {};
  let n = 0;
  NAV_GROUPS.forEach((group) => {
    group.links.forEach((link) => {
      n += 1;
      map[link.to] = { n: String(n).padStart(2, "0"), label: link.label, group: group.label };
    });
  });
  return map;
})();

/** Groups with their numbers filled in, for the sidebar. */
export const NUMBERED_GROUPS = NAV_GROUPS.map((group) => ({
  ...group,
  links: group.links.map((link) => ({ ...link, n: NAV_INDEX[link.to].n })),
}));

export const metaFor = (pathname) =>
  NAV_INDEX[pathname] || { n: "00", label: "Dashboard", group: "Admin" };
