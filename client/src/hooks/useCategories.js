import { useEffect, useState } from 'react';
import axios from 'axios';
import { DEFAULT_SHOP_TREE } from '../data/shopCategories';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * The category tree can now nest to any depth in the admin, but the mega
 * menu / shop sidebar are only designed to surface 3 levels (top category,
 * subcategory, subsubcategory) — so this only projects 2 levels beneath the
 * top one. Anything nested deeper still exists and is still assignable to
 * products (see server/src/controllers/product.controller.js), it just
 * doesn't get its own flyout entry here.
 */
const mapApiTree = (docs = []) =>
  docs.map((cat) => ({
    label: cat.name,
    children: (cat.children || []).map((sub) => ({
      label: sub.name,
      disabled: !!sub.disabled,
      children: (sub.children || []).map((ss) => ({ label: ss.name })),
    })),
  }));

/**
 * The admin-managed category tree that drives the mega menu and the shop
 * sidebar filters.
 *
 * Starts from the bundled default so the menu paints immediately and never
 * flashes empty; the fetched tree then replaces it. A failed request is
 * deliberately silent the defaults are already on screen.
 */
export default function useCategories() {
  const [tree, setTree] = useState(DEFAULT_SHOP_TREE);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    axios
      .get(`${API_BASE}/api/categories`, { signal: controller.signal })
      .then(({ data }) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!ignore && items.length) setTree(mapApiTree(items));
      })
      .catch(() => {
        /* Defaults stay on screen. */
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  return tree;
}
