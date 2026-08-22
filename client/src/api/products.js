// /src/api/products.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const http = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

// Normalize API product (always up-to-date with backend schema)
export const mapProductFromApi = (doc = {}) => {
  const id = doc._id || doc.id || "";
  const images = Array.isArray(doc.images) ? doc.images : [];
  const image = typeof doc.image === "string" && doc.image.trim() ? doc.image : (images && images[0] ? images[0] : "");
  return {
    id,
    title: doc.title || "",
    category: doc.category || "",
    subcategory: doc.subcategory || "",
    subsubcategory: doc.subsubcategory || "",
    price: typeof doc.price === "number" ? doc.price : 0,
    salePrice: doc.salePrice === null ? null : (typeof doc.salePrice === "number" ? doc.salePrice : null),
    stock: typeof doc.stock === "number" ? doc.stock : 0,
    inStock: typeof doc.inStock === "boolean" ? doc.inStock : (doc.stock > 0),
    published: !!doc.published,
    featured: !!doc.featured,
    description: doc.description || "",
    dimensions: doc.dimensions || "",
    color: doc.color || "",
    image,
    images,
    slug: doc.slug || "",
    donated: !!doc.donated,
    contactForPrice: !!doc.contactForPrice,
  };
};

export const listProducts = async (params = {}) => {
  const res = await http.get("/api/products", { params });
  const items = Array.isArray(res.data?.items) ? res.data.items.map(mapProductFromApi) : [];
  // In case pagination keys are added to backend, handle them
  const total = typeof res.data?.total === "number" ? res.data.total : items.length;
  const page = typeof res.data?.page === "number" ? res.data.page : 1;
  const totalPages = typeof res.data?.totalPages === "number" ? res.data.totalPages : 1;
  return { items, total, page, totalPages };
};

export const getProduct = async (idOrSlug) => {
  const res = await http.get(`/api/products/${idOrSlug}`);
  return mapProductFromApi(res.data || {});
};
