import { useContext } from "react";
import { AnnouncementsContext } from "../context/announcementsContext";

/** The live announcements ({ items, loading, refresh }); shared, fetched once for the whole site. */
export const useAnnouncements = () => useContext(AnnouncementsContext);

export default useAnnouncements;
