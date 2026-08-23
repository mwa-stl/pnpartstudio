import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { NUMBERED_GROUPS } from "../data/adminNav.js";

axios.defaults.withCredentials = true;

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const LOGOUT_URL = `${API_BASE}/api/auth/logout`;

const linkClass = ({ isActive }) =>
  `flex items-baseline gap-3.5 px-3 py-2.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] transition-colors duration-250 border-l-2 select-none ${
    isActive
      ? "bg-ink text-paper border-vermillion"
      : "bg-transparent text-graphite border-transparent hover:text-vermillion"
  }`;

const AdminSidebar = ({ open, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("accessToken");
      await axios.post(LOGOUT_URL, {}, { withCredentials: true });
      toast.success("Logged out");
    } catch {
      // The local token is already cleared, so the session is over either way.
      toast.info("Signed out locally");
    } finally {
      setTimeout(() => navigate("/admin/login", { replace: true }), 350);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-ink/55 z-40 transition-opacity lg:hidden ${open ? "block" : "hidden"}`}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        className={`
          fixed z-50 top-0 left-0 w-[84vw] max-w-[268px] h-dvh bg-paper border-r border-ink flex flex-col
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0 lg:h-full lg:w-[248px] lg:shrink-0
        `}
        role="navigation"
        aria-label="Admin navigation"
      >
        {/* Brand */}
        <div className="px-5 h-16 border-b border-ink shrink-0 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="text-ink leading-none truncate"
              style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 500, fontSize: "1.15rem", letterSpacing: "-0.02em" }}
            >
              PnP Artstudio
            </div>
            <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-slate mt-1.5">
              Admin console
            </div>
          </div>
          <button
            className="lg:hidden text-graphite hover:text-vermillion transition-colors p-1 shrink-0"
            aria-label="Close navigation"
            onClick={onClose}
            tabIndex={open ? 0 : -1}
          >
            <X size={18} strokeWidth={1.7} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col py-5 gap-7 overflow-y-auto min-h-0 sidebar-hide-scroll">
          {NUMBERED_GROUPS.map(group => (
            <div key={group.label}>
              <div className="label-mono px-5 mb-2.5">{group.label}</div>
              <div className="flex flex-col px-2">
                {group.links.map(({ to, n, label }) => (
                  <NavLink key={to} to={to} className={linkClass} onClick={onClose}>
                    <span className="text-vermillion tabular-nums text-[0.58rem] shrink-0">{n}</span>
                    <span className="truncate">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto w-full px-5 py-5 border-t border-ink shrink-0 flex flex-col gap-4">
          <button type="button" className="btn btn-danger w-full" onClick={handleLogout} aria-label="Log out">
            <LogOut size={14} strokeWidth={1.8} />
            Log out
          </button>
          <span className="block text-center font-mono text-[0.52rem] uppercase tracking-[0.14em] text-slate select-none">
            © {new Date().getFullYear()} PnP Artstudio
          </span>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
