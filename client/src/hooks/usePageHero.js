import { useEffect, useState } from 'react';
import axios from 'axios';
import { DEFAULT_PAGE_HEROES, mergePageHero } from '../data/pageHeroes';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Masthead copy for one storefront page, managed in the admin console under
 * Site content → Page mastheads.
 *
 * `key` must be one of the keys in DEFAULT_PAGE_HEROES. The bundled copy
 * renders immediately so the headline never flashes blank, and a failed
 * request simply leaves it in place.
 */
export default function usePageHero(key) {
  const [hero, setHero] = useState(() => DEFAULT_PAGE_HEROES[key] || DEFAULT_PAGE_HEROES.shop);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    axios
      .get(`${API_BASE}/api/page-heroes/${key}`, { signal: controller.signal })
      .then(({ data }) => { if (!ignore) setHero(mergePageHero(key, data)); })
      .catch(() => { /* Defaults stay on screen. */ });

    return () => { ignore = true; controller.abort(); };
  }, [key]);

  return hero;
}
