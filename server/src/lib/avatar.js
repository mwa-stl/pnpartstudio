import { createAvatar } from '@dicebear/core';
import { avataaars, initials } from '@dicebear/collection';

const seedOf = (s) => {
  const v = String(s || '').trim();
  return v || 'guest';
};

/**
 * A colourful illustrated person, deterministic per seed — same person
 * always gets the same avatar. Used where a photo-like image is expected
 * (testimonials, shown large in the storefront carousel), as a stand-in
 * when the admin didn't upload a photo.
 */
export function generatePersonAvatar(seed) {
  return createAvatar(avataaars, { seed: seedOf(seed), size: 128 }).toDataUri();
}

/**
 * A compact initials badge much lighter than `avataaars`, which matters
 * here since a product's reviews render many of these at once. Reviewers
 * never upload a photo of themselves at all (see Review.js), so this is
 * always shown, not just a fallback for a missing upload.
 */
export function generateInitialsAvatar(seed) {
  return createAvatar(initials, { seed: seedOf(seed), size: 96 }).toDataUri();
}
