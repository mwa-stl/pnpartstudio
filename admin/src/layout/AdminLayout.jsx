import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Menu } from "lucide-react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import { metaFor } from "../data/adminNav.js";
import "react-toastify/dist/ReactToastify.css";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const { n: index, label: title } = metaFor(pathname);

  return (
    /* `w-full`, never `w-screen`: 100vw includes the vertical scrollbar, so the
         shell ended up ~15px wider than the viewport and the whole console
         scrolled sideways. */
      <div className="h-screen min-h-0 w-full bg-paper text-ink flex overflow-hidden">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-0 h-screen min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 w-full h-16 bg-paper border-b border-ink flex items-center px-4 sm:px-6 shrink-0 gap-4">
          <button
            className="p-2 border border-rule-strong lg:hidden hover:bg-ink hover:text-paper hover:border-ink transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} strokeWidth={1.7} />
          </button>

          <div className="flex items-baseline gap-3.5 min-w-0">
            <span className="font-mono text-[0.62rem] text-vermillion tabular-nums shrink-0">{index}</span>
            <h1 className="page-title !text-[1.2rem] truncate">{title}</h1>
          </div>

          <div className="flex-1" />

          <span className="hidden sm:block font-mono text-[0.56rem] uppercase tracking-[0.16em] text-slate">
            Admin console
          </span>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 md:px-8 py-7 w-full">
          <Outlet />
        </main>

        <ToastContainer
          position="bottom-right"
          autoClose={2600}
          newestOnTop
          hideProgressBar
          theme="light"
          toastStyle={{
            fontFamily: "var(--font-body)",
            fontSize: "0.84rem",
            borderRadius: 0,
            border: "1px solid var(--color-ink)",
            boxShadow: "none",
          }}
        />
      </div>
    </div>
  );
};

export default AdminLayout;
