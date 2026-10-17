import React, { createContext, useContext, useEffect, useReducer } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const initialState = {
  items: [],
  wishlist: [],
  isOpen: false
};

const CartContext = createContext({
  state: initialState,
  dispatch: () => {},
  totalItems: 0,
  totalPrice: 0,
  clearCart: () => {}
});

const cartReducer = (state, action) => {
  switch (action.type) {
    // Cart
    case "ADD_ITEM": {
      const { id } = action.payload;
      const existing = state.items.find((it) => it.id === id);
      const items = existing
        ? state.items.map((it) =>
            it.id === id
              ? { ...it, quantity: (it.quantity || 1) + (action.payload.quantity || 1) }
              : it
          )
        : [...state.items, { ...action.payload, quantity: action.payload.quantity || 1 }];
      return { ...state, items };
    }
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((it) => it.id !== action.payload) };
    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === action.payload.id ? { ...it, quantity: Math.max(1, action.payload.quantity) } : it
        )
      };
    case "CLEAR_CART":
      return { ...state, items: [] };
    // Prices saved in the browser go stale when a sale starts or ends; the
    // server's current price (live sale included) replaces them.
    case "SYNC_PRICES": {
      const fresh = action.payload || {};
      const apply = (it) => {
        const f = fresh[it.id];
        return f ? { ...it, price: f.price, salePrice: f.salePrice, sale: f.sale || null } : it;
      };
      return { ...state, items: state.items.map(apply), wishlist: state.wishlist.map(apply) };
    }
    case "TOGGLE_CART":
      return { ...state, isOpen: !state.isOpen };
    case "CLOSE_CART":
      return { ...state, isOpen: false };
    // Wishlist
    case "WISHLIST_ADD": {
      const exists = state.wishlist.some((w) => w.id === action.payload.id);
      if (exists) return state;
      return { ...state, wishlist: [...state.wishlist, action.payload] };
    }
    case "WISHLIST_REMOVE":
      return { ...state, wishlist: state.wishlist.filter((w) => w.id !== action.payload.id) };
    case "WISHLIST_TOGGLE": {
      const exists = state.wishlist.some((w) => w.id === action.payload.id);
      return exists
        ? { ...state, wishlist: state.wishlist.filter((w) => w.id !== action.payload.id) }
        : { ...state, wishlist: [...state.wishlist, action.payload] };
    }
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const getPersisted = () => {
    try {
      const raw = localStorage.getItem("APP_CART_STATE");
      if (!raw) return initialState;
      const parsed = JSON.parse(raw);
      // Never trust the shape of persisted data, and never restore the
      // drawer as open that should always start closed on a fresh load.
      return {
        items: Array.isArray(parsed?.items) ? parsed.items : [],
        wishlist: Array.isArray(parsed?.wishlist) ? parsed.wishlist : [],
        isOpen: false,
      };
    } catch {
      return initialState;
    }
  };
  const [state, dispatch] = useReducer(cartReducer, undefined, getPersisted);

  useEffect(() => {
    try {
      // `isOpen` is transient UI state keep it out of storage
      const { items, wishlist } = state;
      localStorage.setItem("APP_CART_STATE", JSON.stringify({ items, wishlist }));
    } catch { /* storage full or unavailable cart still works in memory */ }
  }, [state]);

  // Re-price whatever is saved, on load and whenever the tab comes back.
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const ids = [...new Set([...state.items, ...state.wishlist].map((it) => it.id).filter(Boolean))];
      if (!ids.length) return;
      try {
        const { data } = await axios.get(`${API_BASE}/api/products/prices`, { params: { ids: ids.join(",") } });
        if (!cancelled && data?.items) dispatch({ type: "SYNC_PRICES", payload: data.items });
      } catch { /* offline or API down — keep the saved prices */ }
    };
    sync();
    const onVisible = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVisible); };
    // Only on mount: later cart edits do not need a re-price, and re-running
    // on every change would loop through SYNC_PRICES.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalItems = state.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  const totalPrice = state.items.reduce((sum, it) => {
    const unit =
      typeof it.salePrice === "number" && it.salePrice !== null && it.salePrice < it.price
        ? it.salePrice
        : it.price || 0;
    return sum + unit * (it.quantity || 1);
  }, 0);

  const clearCart = () => dispatch({ type: "CLEAR_CART" });

  return (
    <CartContext.Provider
      value={{
        state,
        dispatch,
        totalItems,
        totalPrice,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Co-located with the provider by design every consumer already imports
// from this module. Fast Refresh loses component state in this one file
// during edits, which is an acceptable trade for the simpler import path.
// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};
