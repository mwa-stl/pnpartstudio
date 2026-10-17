import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { ShoppingCart, Heart, Menu, X, ArrowUpRight, Plus } from "lucide-react";
import { useCart } from "../context/CartContext";
import CartDropdown from "./CartDropdown";
import AnnouncementBar from "./AnnouncementBar";
import useAnnouncements from "../hooks/useAnnouncements";
import ShopMegaMenu from "./ShopMegaMenu";
import logoBlack from "../assets/pnplogoblack1.png";
import logoWhite from "../assets/pnplogowhite.png";

const baseNavLinks = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Shop", to: "/shop" },
  { label: "Art Classes", to: "/art-classes" },
  { label: "Custom Art", to: "/custom-order" },
  { label: "Gallery", to: "/gallery" },
  { label: "Contact", to: "/contact" }
];

const EASE = [0.16, 1, 0.3, 1];

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  // A live announcement adds one animated link right after Shop.
  const { items: announcements } = useAnnouncements();
  const navLinks = useMemo(() => {
    const forNav = announcements.filter((a) => a.showInNav);
    if (!forNav.length) return baseNavLinks;
    const first = forNav[0];
    const sale = {
      label: first.navLabel || "Sale",
      to: forNav.length === 1 ? `/sale/${first.slug}` : "/sale",
      sale: true,
      accent: first.accent,
    };
    const at = baseNavLinks.findIndex((l) => l.label === "Shop") + 1;
    return [...baseNavLinks.slice(0, at), sale, ...baseNavLinks.slice(at)];
  }, [announcements]);
  const [shopOpen, setShopOpen] = useState(false);       // desktop mega menu
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const { totalItems, state, dispatch } = useCart();
  const location = useLocation();
  const shopRef = useRef(null);
  const shopCloseTimer = useRef(null);

  /* Opening is instant; closing waits a beat. Without the delay the panel
     vanished the moment the pointer crossed the strip of header between the
     nav link and the panel's top edge, which made the links unreachable. */
  const openShop = useCallback(() => {
    clearTimeout(shopCloseTimer.current);
    setShopOpen(true);
  }, []);
  const closeShop = useCallback((immediate = false) => {
    clearTimeout(shopCloseTimer.current);
    if (immediate) { setShopOpen(false); return; }
    shopCloseTimer.current = setTimeout(() => setShopOpen(false), 180);
  }, []);

  useEffect(() => () => clearTimeout(shopCloseTimer.current), []);

  useEffect(() => {
    setMenuOpen(false); setShopOpen(false); setMobileShopOpen(false);
  }, [location.pathname, location.search]);

  const wishlistCount = (state?.wishlist || []).length || 0;

  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : false);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") { setMenuOpen(false); setShopOpen(false); setMobileShopOpen(false); }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (!shopOpen) return undefined;
    const onDocClick = (e) => {
      if (shopRef.current && !shopRef.current.contains(e.target)) setShopOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [shopOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleCartClick = () => { dispatch?.({ type: "TOGGLE_CART" }); };

  // The header inverts to ink once you leave the top of the page.
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));

  const navItem = ({ isActive }) =>
    `relative font-mono text-[0.66rem] font-medium uppercase tracking-[0.16em] transition-colors duration-300 py-1
     ${isActive
        ? "text-vermillion"
        : scrolled ? "text-paper/70 hover:text-paper" : "text-graphite hover:text-ink"}
     after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-px after:bg-vermillion after:transition-all after:duration-400
     ${isActive ? "after:w-full" : "after:w-0 hover:after:w-full"}`;

  const iconBtn = `relative p-2 transition-colors duration-300 ${scrolled ? "text-paper/80 hover:text-paper" : "text-ink hover:text-vermillion"}`;
  const badge = "absolute -top-0.5 -right-0.5 bg-vermillion text-white font-mono text-[0.55rem] font-semibold w-[17px] h-[17px] flex items-center justify-center";

  return (
    <>
    <header
      className={`w-full fixed z-40 top-0 left-0 border-b transition-colors duration-500 ${
        scrolled ? "bg-ink border-ink" : "bg-paper/92 backdrop-blur-md border-rule"
      }`}
    >
      <AnnouncementBar />
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" style={{ height: 84 }}>

        {/* Wordmark */}
        <Link to="/" aria-label="PnP Artstudio home" className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0 group">
          <img
            src={scrolled ? logoWhite : logoBlack}
            alt=""
            className="h-8 sm:h-10 w-auto shrink-0 transition-opacity duration-300"
            width={60} height={40}
          />
          <span className="block leading-none min-w-0">
            <span
              className={`block truncate transition-colors duration-500 text-[1.05rem] sm:text-[1.4rem] ${scrolled ? "text-paper" : "text-ink"}`}
              style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.02em" }}
            >
              PnP Artstudio
            </span>
            {/* The strapline is the first thing to go when space is tight —
                the name itself now stays visible at every width. */}
            <span className={`hidden sm:block font-mono text-[0.54rem] uppercase tracking-[0.22em] mt-1 transition-colors duration-500 ${scrolled ? "text-paper/45" : "text-slate"}`}>
              Priyanka Vasista Est. Missouri
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {navLinks.map(({ label, to, sale, accent }) =>
              sale ? (
                <li key="sale-link">
                  <NavLink to={to} className="nav-sale font-mono text-[0.66rem] font-semibold uppercase tracking-[0.16em] py-1" style={{ "--sale-accent": accent || "#E8340C" }}>
                    <span className="nav-sale-dot" aria-hidden="true" />
                    <span className="nav-sale-text">{label}</span>
                  </NavLink>
                </li>
              ) : label !== "Shop" ? (
                <li key={to}>
                  <NavLink to={to} className={navItem}>{label}</NavLink>
                </li>
              ) : (
                /* Hover opens the panel; the label itself is a real link, so
                   clicking Shop lands on the full catalogue rather than only
                   toggling a menu. */
                <li
                  key="Shop"
                  ref={shopRef}
                  className="relative"
                  onMouseEnter={openShop}
                  onMouseLeave={() => closeShop()}
                >
                  {/* Invisible bridge covering the header below the link, so
                      the pointer never leaves the subtree on its way down. */}
                  {shopOpen && (
                    <span
                      aria-hidden="true"
                      className="absolute left-1/2 -translate-x-1/2 top-full w-[220px] h-8"
                    />
                  )}

                  <NavLink
                    to={to}
                    className={navItem}
                    onFocus={openShop}
                    aria-expanded={shopOpen}
                    aria-haspopup="true"
                    aria-controls="shop-mega-menu"
                  >
                    <span className="flex items-center gap-1.5">
                      {label}
                      <Plus size={11} className={`transition-transform duration-400 ${shopOpen ? "rotate-45" : ""}`} />
                    </span>
                  </NavLink>

                  <AnimatePresence>
                    {shopOpen && (
                      <motion.div
                        id="shop-mega-menu"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.28, ease: EASE }}
                        /* Anchored to the header, not the link, so the panel
                           can span the page and there is no gap for the
                           pointer to fall through on the way down. */
                        className="fixed left-0 right-0 z-40 bg-paper border-y border-ink"
                        style={{ top: "calc(84px + var(--bar-h, 0px))" }}
                        onMouseEnter={openShop}
                        onMouseLeave={() => closeShop()}
                      >
                        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
                          <ShopMegaMenu onNavigate={() => closeShop(true)} />

                          <div className="border-l border-rule pl-10 hidden lg:flex flex-col justify-between">
                            <div>
                              <div className="section-index mb-5">The Shop</div>
                              <p className="text-graphite text-[0.9rem] leading-relaxed mb-7">
                                Every piece is the original — signed, packed with
                                archival materials, and shipped from the studio.
                              </p>
                            </div>
                            <Link to="/shop" onClick={() => closeShop(true)} className="btn-k btn-k-sm self-start">
                              Browse everything <ArrowUpRight size={12} />
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            )}
          </ul>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <NavLink to="/wishlist" className={iconBtn} aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} items` : ""}`} title="Wishlist">
            <Heart size={19} strokeWidth={1.6} />
            {wishlistCount > 0 && <span className={badge}>{wishlistCount}</span>}
          </NavLink>

          {isDesktop && (
            <Link
              to="/track-order"
              className={`font-mono text-[0.62rem] uppercase tracking-[0.14em] px-4 py-2.5 border transition-colors duration-300 ${
                scrolled
                  ? "border-paper/40 text-paper hover:bg-vermillion hover:border-vermillion"
                  : "border-ink text-ink hover:bg-ink hover:text-paper"
              }`}
            >
              Track Order
            </Link>
          )}

          <button className={iconBtn} aria-label={`Cart${totalItems ? `, ${totalItems} items` : ""}`} title="Cart" onClick={handleCartClick}>
            <ShoppingCart size={19} strokeWidth={1.6} />
            {totalItems > 0 && <span className={badge}>{totalItems}</span>}
          </button>

          <CartDropdown />

          <button
            className={`block lg:hidden p-2 ml-0.5 transition-colors duration-300 ${scrolled ? "text-paper" : "text-ink"}`}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu size={22} strokeWidth={1.6} />
          </button>
        </div>
      </div>

    </header>

    {/*
      Portaled straight to <body>, not rendered inside <header>. A
      `position: fixed` descendant is only fixed to the viewport as long as
      no ancestor sets a transform/filter/perspective — header's own
      `backdrop-blur-md` and the surrounding motion elements can trigger
      that in some browsers, which silently turns "fixed to the viewport"
      into "fixed to the header's own 84px box" and made this takeover look
      like it never fully opened. Rendering outside that subtree removes
      the possibility entirely.
    */}
    {createPortal(
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.55, ease: EASE }}
            /* `data-lenis-prevent`: Lenis runs with smoothWheel/touch on the
               whole document and drives window scroll itself, swallowing the
               native scroll of any nested container. Without this the menu's
               own list could not be scrolled at all, so on a short screen the
               links past the fold were simply unreachable. */
            data-lenis-prevent
            className="lg:hidden fixed inset-0 z-50 bg-ink on-ink flex flex-col overflow-y-auto overscroll-contain"
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between px-5 border-b border-paper/15 shrink-0" style={{ height: 84 }}>
              <span className="flex items-center gap-2.5 leading-none">
                <img src={logoWhite} alt="" className="h-7 w-auto" width={42} height={28} />
                <span
                  className="text-paper"
                  style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 500, fontSize: "1.1rem", letterSpacing: "-0.02em" }}
                >
                  PnP Artstudio
                </span>
              </span>
              <button className="text-paper p-2" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X size={22} strokeWidth={1.6} />
              </button>
            </div>

            <div className="flex-1 px-5 py-8">
              <ul className="flex flex-col">
                {navLinks.map((link, i) =>
                  link.sale ? (
                    <li key="sale-link" className="border-b border-paper/12">
                      <NavLink to={link.to} className="nav-sale flex items-baseline gap-4 py-4 group" style={{ "--sale-accent": link.accent || "#E8340C" }} onClick={() => setMenuOpen(false)}>
                        <span className="font-mono text-[0.6rem] text-vermillion tabular-nums">0{i + 1}</span>
                        <span className="nav-sale-text t-display !text-[2rem] inline-flex items-center gap-3">
                          <span className="nav-sale-dot" aria-hidden="true" />
                          {link.label}
                        </span>
                      </NavLink>
                    </li>
                  ) : link.label === "Shop" ? (
                    <li key="Shop" className="border-b border-paper/12">
                      {/* Tapping Shop expands the categories in place; the
                          arrow beside it still goes straight to /shop. */}
                      <div className="flex items-center">
                        <button
                          className="flex-1 flex items-baseline gap-4 py-4 text-left group"
                          onClick={() => setMobileShopOpen((v) => !v)}
                          aria-expanded={mobileShopOpen}
                          aria-controls="mobile-shop-menu"
                        >
                          <span className="font-mono text-[0.6rem] text-vermillion tabular-nums">0{i + 1}</span>
                          <span className="t-display !text-[2rem] text-paper group-hover:text-vermillion transition-colors">
                            Shop
                          </span>
                          <Plus
                            size={18}
                            className={`text-paper/40 shrink-0 self-center ml-auto transition-transform duration-400 ${mobileShopOpen ? "rotate-45" : ""}`}
                          />
                        </button>
                        <NavLink
                          to="/shop"
                          onClick={() => setMenuOpen(false)}
                          className="p-3 text-paper/40 hover:text-vermillion transition-colors"
                          aria-label="Browse all products"
                        >
                          <ArrowUpRight size={20} />
                        </NavLink>
                      </div>

                      <AnimatePresence initial={false}>
                        {mobileShopOpen && (
                          <motion.div
                            id="mobile-shop-menu"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: EASE }}
                            className="overflow-hidden"
                          >
                            <div className="pb-7 pt-1">
                              <ShopMegaMenu tone="ink" onNavigate={() => setMenuOpen(false)} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  ) : (
                    <li key={link.to} className="border-b border-paper/12">
                      <NavLink to={link.to} className="flex items-baseline gap-4 py-4 group" onClick={() => setMenuOpen(false)}>
                        <span className="font-mono text-[0.6rem] text-vermillion tabular-nums">0{i + 1}</span>
                        <span className="t-display !text-[2rem] text-paper group-hover:text-vermillion transition-colors">{link.label}</span>
                      </NavLink>
                    </li>
                  )
                )}
                <li className="border-b border-paper/12">
                  <NavLink to="/wishlist" className="flex items-baseline gap-4 py-4 group" onClick={() => setMenuOpen(false)}>
                    <span className="font-mono text-[0.6rem] text-vermillion tabular-nums">{String(navLinks.length + 1).padStart(2, "0")}</span>
                    <span className="t-display !text-[2rem] text-paper group-hover:text-vermillion transition-colors">
                      Wishlist {wishlistCount > 0 && <sup className="font-mono text-[0.7rem] text-vermillion">{wishlistCount}</sup>}
                    </span>
                  </NavLink>
                </li>
              </ul>
            </div>

            <div className="px-5 pb-8 shrink-0">
              <Link
                to="/track-order"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full border border-paper/50 text-paper font-mono text-[0.66rem] uppercase tracking-[0.16em] py-4 hover:bg-vermillion hover:border-vermillion transition-colors"
              >
                Track Order <ArrowUpRight size={14} />
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );
};

export default Header;
