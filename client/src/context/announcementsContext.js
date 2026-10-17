import { createContext } from "react";

export const AnnouncementsContext = createContext({
  items: [],
  loading: true,
  refresh: () => {},
});
