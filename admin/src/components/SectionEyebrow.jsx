import React from "react";
import { useLocation } from "react-router-dom";
import { metaFor } from "../data/adminNav.js";

/**
 * The small "07 SITE CONTENT ———" line above a page title.
 * Reads its number and group from the nav config keyed on the current route,
 * so pages never carry a hardcoded index that can fall out of step.
 */
const SectionEyebrow = ({ className = "" }) => {
  const { pathname } = useLocation();
  const { n, group } = metaFor(pathname);

  return (
    <div className={`flex items-center gap-3 mb-3 ${className}`.trim()}>
      <span className="font-mono text-[0.62rem] text-vermillion tabular-nums">{n}</span>
      <span className="label-mono">{group}</span>
      <span className="h-px w-10 bg-rule" />
    </div>
  );
};

export default SectionEyebrow;
