import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const CATEGORIES_URL = `${API_BASE}/api/categories`;

export const getCategories = async () => {
  const { data } = await axios.get(CATEGORIES_URL, { withCredentials: true });
  return Array.isArray(data?.items) ? data.items : [];
};

export const createCategory = async (payload) => {
  const { data } = await axios.post(CATEGORIES_URL, payload, { withCredentials: true });
  return data;
};

export const updateCategory = async (id, payload) => {
  const { data } = await axios.put(`${CATEGORIES_URL}/${id}`, payload, { withCredentials: true });
  return data;
};

export const deleteCategory = async (id) => {
  await axios.delete(`${CATEGORIES_URL}/${id}`, { withCredentials: true });
  return true;
};
