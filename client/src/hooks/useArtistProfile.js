import { useEffect, useState } from 'react';
import axios from 'axios';
import { DEFAULT_ARTIST_PROFILE, mergeArtistProfile } from '../data/artistProfile';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Artist copy for the Home and About pages, managed in the admin console.
 *
 * Starts from the bundled defaults so the section paints immediately and
 * never flashes empty; the fetched document then replaces it. A failed
 * request is deliberately silent the defaults are already on screen.
 */
export default function useArtistProfile() {
  const [profile, setProfile] = useState(DEFAULT_ARTIST_PROFILE);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    axios
      .get(`${API_BASE}/api/artist-profile`, { signal: controller.signal })
      .then(({ data }) => {
        if (!ignore) setProfile(mergeArtistProfile(data));
      })
      .catch(() => {
        /* Defaults stay on screen. */
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  return profile;
}
