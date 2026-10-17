import React, { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import AdminLayout from "./layout/AdminLayout.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import ClassesPage from "./pages/ClassesPage.jsx";
import GalleryPage from "./pages/GalleryPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import AdminRegister from "./pages/AdminRegister.jsx";
import CouponsPage from "./pages/CouponsPage.jsx";
import NewslettersPage from "./pages/NewslettersPage.jsx";
import TestimonialsPage from "./pages/TestimonialsPage.jsx";
import StorePickupOrdersPage from "./pages/StorePickupOrdersPage.jsx";
import AdminHeroSliderPage from "./pages/AdminHeroSliderPage.jsx";
import ArtistProfilePage from "./pages/ArtistProfilePage.jsx";
import ContactSettingsPage from "./pages/ContactSettingsPage.jsx";
import PageHeroesPage from "./pages/PageHeroesPage.jsx";
import ReviewsPage from "./pages/ReviewsPage.jsx";
import WelcomePopupPage from "./pages/WelcomePopupPage.jsx";
import BulkWatermarkPage from "./pages/BulkWatermarkPage.jsx";
import AnnouncementsPage from "./pages/AnnouncementsPage.jsx";
import StoragePage from "./pages/StoragePage.jsx";

const ME_URL = `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/auth/me`;

/**
 * Gate for the console. The session is an httpOnly cookie the page cannot see,
 * so the only way to know whether it is valid is to ask the server who we are.
 */
function RequireAdmin() {
  const location = useLocation();
  const [state, setState] = useState("checking"); // checking | ok | anonymous

  useEffect(() => {
    let cancelled = false;
    axios.get(ME_URL, { withCredentials: true })
      .then(() => { if (!cancelled) setState("ok"); })
      .catch(() => { if (!cancelled) setState("anonymous"); });
    return () => { cancelled = true; };
  }, []);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper" role="status" aria-label="Checking your session">
        <span className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-slate">Checking session…</span>
      </div>
    );
  }
  if (state === "anonymous") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public admin login */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />

        {/* Protected admin area with nested routes and a shared layout */}
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="products" replace />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="testimonials" element={<TestimonialsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="newsletters" element={<NewslettersPage />} />
            <Route path="store-pickup-orders" element={<StorePickupOrdersPage />} />
            <Route path="hero-sliders" element={<AdminHeroSliderPage />} />
            <Route path="artist-profile" element={<ArtistProfilePage />} />
            <Route path="contact-details" element={<ContactSettingsPage />} />
            <Route path="page-mastheads" element={<PageHeroesPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="welcome-popup" element={<WelcomePopupPage />} />
            <Route path="bulk-watermark" element={<BulkWatermarkPage />} />
            <Route path="storage" element={<StoragePage />} />
          </Route>
        </Route>
        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
