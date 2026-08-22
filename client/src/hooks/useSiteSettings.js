import { useEffect, useState } from 'react';
import axios from 'axios';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '../data/siteSettings';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/* One in-flight request and one cached answer for the whole app: the footer
   renders on every route, so without this each navigation would refetch. */
let cache = null;
let inflight = null;

/**
 * Studio contact details, managed in the admin console.
 * Starts from the bundled defaults so nothing flashes empty; the fetched
 * document then replaces them. A failed request is deliberately silent.
 */
export default function useSiteSettings() {
  const [settings, setSettings] = useState(cache || DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    if (cache) return undefined;
    let ignore = false;

    inflight = inflight || axios.get(`${API_BASE}/api/site-settings`).then(({ data }) => {
      cache = mergeSiteSettings(data);
      return cache;
    });

    inflight
      .then((value) => { if (!ignore) setSettings(value); })
      .catch(() => { inflight = null; /* Defaults stay on screen. */ });

    return () => { ignore = true; };
  }, []);

  return settings;
}
