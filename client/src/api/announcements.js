import axios from "axios";
import { mapProductFromApi } from "./products";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

/** Announcements that are live right now, each with its products (sale prices applied by the server). */
export const fetchActiveAnnouncements = async (signal) => {
  const { data } = await axios.get(`${API_BASE}/api/announcements/active`, { signal });
  return (Array.isArray(data?.items) ? data.items : []).map((a) => ({
    ...a,
    products: (a.products || []).map(mapProductFromApi),
  }));
};
