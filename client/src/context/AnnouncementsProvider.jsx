import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnnouncementsContext } from "./announcementsContext";
import { fetchActiveAnnouncements } from "../api/announcements";

const REFRESH_MS = 5 * 60 * 1000;

/**
 * One fetch of the live announcements for the whole storefront (top bar, menu
 * link, home banner and sale pages all read from it). It re-checks every few
 * minutes and when the tab regains focus, so a sale that starts or ends is
 * picked up without a reload. A failed request just means "no announcements".
 */
const AnnouncementsProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setItems(await fetchActiveAnnouncements());
    } catch {
      /* keep whatever we had */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);

  const value = useMemo(() => ({ items, loading, refresh }), [items, loading, refresh]);
  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
};

export default AnnouncementsProvider;
