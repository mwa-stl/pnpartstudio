import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { megaMenuOf } from "../data/shopCategories";
import useCategories from "../hooks/useCategories";

/**
 * The shop menu's contents — one column per main category, every subcategory
 * visible at once rather than hidden behind a drill-down.
 *
 * Shared by the desktop hover panel and the mobile takeover, so the two can
 * never list different categories.
 */
const ShopMegaMenu = ({ onNavigate, tone = "paper" }) => {
  const onInk = tone === "ink";
  const tree = useCategories();
  const MEGA_MENU = useMemo(() => megaMenuOf(tree), [tree]);

  const head = onInk
    ? "text-paper hover:text-vermillion"
    : "text-ink hover:text-vermillion";
  const leaf = onInk
    ? "text-paper/65 hover:text-vermillion"
    : "text-graphite hover:text-vermillion";
  const rule = onInk ? "border-paper/15" : "border-rule";
  const muted = onInk ? "text-paper/30" : "text-slate/60";

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8 ${onInk ? "" : "lg:grid-cols-2"}`}>
      {MEGA_MENU.map((cat, i) => (
        <div key={cat.label}>
          <Link
            to={cat.href}
            onClick={onNavigate}
            className={`group flex items-baseline gap-3 pb-3 mb-4 border-b ${rule} ${head} transition-colors duration-300`}
          >
            <span className="font-mono text-[0.58rem] text-vermillion tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className="text-[1.15rem] leading-none"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
            >
              {cat.label}
            </span>
            <ArrowUpRight
              size={13}
              className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>

          <ul className="flex flex-col gap-2">
            {cat.groups.map((sub) => (
              <li key={sub.label}>
                {sub.disabled ? (
                  <span className={`block font-mono text-[0.64rem] uppercase tracking-[0.11em] ${muted} cursor-not-allowed`}>
                    {sub.label} <span className="text-vermillion/50">soon</span>
                  </span>
                ) : (
                  <Link
                    to={sub.href}
                    onClick={onNavigate}
                    className={`block font-mono text-[0.64rem] uppercase tracking-[0.11em] ${leaf} transition-colors duration-200`}
                  >
                    {sub.label}
                  </Link>
                )}

                {/* Sub-subcategories sit inline rather than behind another step. */}
                {sub.children.length > 0 && (
                  <ul className={`mt-2 mb-1 ml-3 pl-3 border-l ${rule} flex flex-col gap-1.5`}>
                    {sub.children.map((leafItem) => (
                      <li key={leafItem.label}>
                        <Link
                          to={leafItem.href}
                          onClick={onNavigate}
                          className={`block font-mono text-[0.6rem] uppercase tracking-[0.1em] ${leaf} transition-colors duration-200`}
                        >
                          {leafItem.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default ShopMegaMenu;
