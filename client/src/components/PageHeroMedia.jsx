import React from "react";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

/**
 * Renders an admin-managed page masthead as either a still image or a
 * looping video, chosen from the file extension in its URL — the admin
 * upload accepts both (see admin/src/pages/PageHeroesPage.jsx), and there is
 * no separate "type" field to branch on. Animated GIFs need no special
 * handling here: a plain `<img>` already loops a GIF natively forever.
 *
 * Video autoplay only works muted in every major browser, so this is always
 * silent — it's a moving masthead, not a video with sound.
 */
const PageHeroMedia = ({ src, alt = "", className = "" }) => {
  if (!src) return null;

  if (VIDEO_EXT.test(src)) {
    return (
      <video
        className={className}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        aria-label={alt || undefined}
      />
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" />;
};

export default PageHeroMedia;
