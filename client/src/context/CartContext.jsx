import React, { createContext, useContext, useEffect, useReducer } from "react";

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
