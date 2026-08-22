import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { listProducts } from "../api/products";

const toBool = (v) => (v === "true" ? true : v === "false" ? false : undefined);
const normalize = (s = "") => s.toString().toLowerCase();

export const useProducts = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({
    items: [],
    total: 0,
    page: 1,
    totalPages: 1,
    loading: false,
    error: null
  });

  // Stable representation of current query
  const currentSearch = useMemo(() => searchParams.toString(), [searchParams]);

  const params = useMemo(() => {
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 12);
    const sort = searchParams.get("sort") || "newest";
    const category = searchParams.get("category") || undefined;
    const subcategory = searchParams.get("subcategory") || undefined;
    const subsubcategory = searchParams.get("subsubcategory") || undefined;
    const color = searchParams.get("color") || undefined;
    const q = searchParams.get("q") || undefined;
    const minPrice = searchParams.get("minPrice") || undefined;
    const maxPrice = searchParams.get("maxPrice") || undefined;
    const inStock = toBool(searchParams.get("inStock"));
    const published = toBool(searchParams.get("published")) ?? true;
    return { page, limit, sort, category, subcategory, subsubcategory, color, q, minPrice, maxPrice, inStock, published };
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const api = await listProducts({ published: params.published });
        let items = api.items || [];

        // Product filtering logic (category/sub/subsub/color, etc.)
        if (params.category) items = items.filter((p) => p.category === params.category);
        if (params.subcategory) items = items.filter((p) => p.subcategory === params.subcategory);
        if (params.subsubcategory) items = items.filter((p) => p.subsubcategory === params.subsubcategory);
        if (params.color) items = items.filter((p) => (p.color || "").toLowerCase() === params.color.toLowerCase());
        if (params.inStock !== undefined) items = items.filter((p) => !!p.inStock === params.inStock);
        if (params.minPrice) items = items.filter((p) => Number(p.price) >= Number(params.minPrice));
        if (params.maxPrice) items = items.filter((p) => Number(p.price) <= Number(params.maxPrice));
        if (params.q) {
          const q = normalize(params.q);
          items = items.filter(
            (p) => normalize(p.title).includes(q) || normalize(p.description).includes(q)
          );
        }

        if (params.sort === "price_asc") items.sort((a, b) => Number(a.price) - Number(b.price));
        else if (params.sort === "price_desc") items.sort((a, b) => Number(b.price) - Number(a.price));

        const total = items.length;
        const totalPages = Math.max(1, Math.ceil(total / params.limit));
        const page = Math.min(params.page, totalPages);
        const start = (page - 1) * params.limit;
        const pageItems = items.slice(start, start + params.limit);

        if (!cancelled) setState({ items: pageItems, total, page, totalPages, loading: false, error: null });
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Failed to load products";
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: msg }));
      }
    })();
    return () => { cancelled = true; };
  }, [params]);

  // Canonical builder for the next query string (omit defaults to stabilize)
  const buildSearch = useCallback((sp) => {
    const usp = new URLSearchParams(sp);
    if (usp.get("page") === "1") usp.delete("page");
    return usp.toString();
  }, []);

  const updateParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(currentSearch);
      if (value === undefined || value === null || value === "") next.delete(key);
      else next.set(key, String(value));
      // Reset to first page when changing any filter other than page
      if (key !== "page") next.delete("page");
      const nextSearch = buildSearch(next);
      if (nextSearch !== currentSearch) {
        setSearchParams(nextSearch, { replace: true });
      }
    },
    [currentSearch, setSearchParams, buildSearch]
  );

  return { ...state, params, updateParam, location };
};
