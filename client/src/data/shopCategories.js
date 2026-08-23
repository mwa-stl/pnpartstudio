/**
 * The shop's category tree — one source for the mega menu, the shop sidebar,
 * and the URLs that link them. Categories are now admin-managed (see
 * /api/categories); `DEFAULT_SHOP_TREE` below is only the instant-paint
 * fallback `useCategories` starts from before the live tree arrives (and
 * what stays on screen if the fetch fails), kept in sync with the seed data
 * in server/src/models/Category.js.
 */

/**
 * Sentinel for "no category filter at all".
 *
 * "All Products" is a real category in the database, not a wildcard — a shop
 * filtered to it hides everything under "Indian Products". This gives the
 * unfiltered view its own name so clicking Shop shows the whole catalogue and
 * clicking a category actually narrows it.
 */
export const EVERYTHING = 'Everything';

export const DEFAULT_SHOP_TREE = [
  {
    label: 'All Products',
    children: [
      { label: 'Paintings' },
      { label: 'Holiday gifts' },
      { label: 'Landscapes' },
      { label: 'Modern art' },
      { label: 'Name sign' },
      { label: 'Limited editions' },
      { label: 'Pencil sketches' },
      { label: 'Digital prints', disabled: true },
    ],
  },
  {
    label: 'Indian Products',
    children: [
      { label: 'Indian god paintings' },
      { label: 'Musical Art paintings' },
      {
        label: 'Return gifts',
        children: [
          { label: 'Kolam coasters' },
          { label: 'Kolam peetham' },
          { label: 'Traditional magnets' },
          { label: 'Trays' },
          { label: 'Diya holders' },
        ],
      },
    ],
  },
];

export const mainCategoriesOf = (tree) => (tree || []).map((c) => c.label);

/** The shape the shop page's sidebar expects: { [category]: subcategories }. */
export const productFiltersOf = (tree) =>
  Object.fromEntries(
    (tree || []).map((cat) => [
      cat.label,
      (cat.children || []).map((sub) =>
        sub.children || sub.disabled
          ? { label: sub.label, disabled: sub.disabled, children: sub.children?.map((c) => c.label) }
          : sub.label
      ),
    ])
  );

/** Builds a /shop link. Omitting `category` links to the whole catalogue. */
export const shopHref = ({ category, subcategory, subsubcategory } = {}) => {
  const ps = new URLSearchParams();
  if (category && category !== EVERYTHING) ps.set('category', category);
  if (subcategory) ps.set('subcategory', subcategory);
  if (subsubcategory) ps.set('subsubcategory', subsubcategory);
  const qs = ps.toString();
  return qs ? `/shop?${qs}` : '/shop';
};

/**
 * Flattened links per main category, for the mega menu — sub-subcategories
 * are folded in under their parent so the menu can show everything at once.
 */
export const megaMenuOf = (tree) =>
  (tree || []).map((cat) => ({
    label: cat.label,
    href: shopHref({ category: cat.label }),
    groups: (cat.children || []).map((sub) => ({
      label: sub.label,
      href: shopHref({ category: cat.label, subcategory: sub.label }),
      disabled: !!sub.disabled,
      children: (sub.children || []).map((leaf) => ({
        label: leaf.label,
        href: shopHref({
          category: cat.label,
          subcategory: sub.label,
          subsubcategory: leaf.label,
        }),
      })),
    })),
  }));
