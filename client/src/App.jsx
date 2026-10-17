import React, { useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import "./index.css";
import { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ShopPage from "./pages/ShopPage";
import GalleryPage from "./pages/GalleryPage";
import ContactPage from "./pages/ContactPage";
import WishlistPage from "./pages/WishlistPage";
import CartPage from "./pages/CartPage";
import CustomOrderPage from "./pages/CustomOrderPage";
import CheckoutPage from "./pages/CheckoutPage";
import ProductViewPage from "./pages/ProductViewPage";
import PageNotFound from "./pages/PageNotFound";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ReturnsPage from "./pages/ReturnsPage";
import ShippingPage from "./pages/ShippingPage";
import ArtClassesPage from "./pages/ArtClassesPage";
import ClassDetailPage from "./pages/ClassDetailPage";
import OrderSuccess from "./pages/OrderSuccess";
import TrackOrderPage from "./pages/TrackOrderPage";
import OrderConfirmation from "./pages/OrderConfirmation";
import { CartProvider } from "./context/CartContext";
import ScrollToTop from "./components/ScrollToTop";
import BackToTop from "./components/BackToTop";
import FallingCart from "./components/FallingCart";
import WhatsAppButton from "./components/WhatsAppButton";
import DiscountPopup from "./components/DiscountPopup";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import StorePickupSuccessPage from "./pages/StorePickupSuccessPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import SalePage from "./pages/SalePage";
import AnnouncementsProvider from "./context/AnnouncementsProvider";
import SmoothScroll from "./components/SmoothScroll";
import GrainOverlay from "./components/motion/GrainOverlay";

const RouteAwareFallingCart = () => {
  const location = useLocation();
  const showFallingCart = location.pathname === "/" || location.pathname.startsWith("/shop");
  if (!showFallingCart) return null;
  return (
    <FallingCart
      right={16}
      bottomOffset={84}
      speedFactor={2.2}
      maxStart={1.1}
      size={22}
      navigateTo="/cart"
      // Desktop only. On a phone it drifts down over the hero for several
      // seconds and collides with the two corner buttons, and the header
      // already carries a cart icon there.
      className="hidden lg:block"
    />
  );
};

const App = () => {
  const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";
  const paypalOptions = useMemo(
    () => ({
      "client-id": PAYPAL_CLIENT_ID,
      currency: "USD",
      intent: "capture",
      components: "buttons"
    }),
    [PAYPAL_CLIENT_ID]
  );

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <CartProvider>
        <AnnouncementsProvider>
        <Router>
          <SmoothScroll>
            <ScrollToTop />
            <GrainOverlay />
            <div className="flex flex-col min-h-screen bg-paper text-ink">
              <Header />
            <main className="grow pt-nav">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/shop/category/:category" element={<ShopPage />} />
                <Route path="/sale" element={<SalePage />} />
                <Route path="/sale/:slug" element={<SalePage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/custom-order" element={<CustomOrderPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/product-details" element={<ProductViewPage />} />
                <Route path="/art-classes" element={<ArtClassesPage />} />
                <Route path="/art-classes/:id" element={<ClassDetailPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/returns" element={<ReturnsPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:id" element={<BlogPostPage />} />
                <Route path="/shipping" element={<ShippingPage />} />
                <Route path="/order/success" element={<OrderSuccess />} />
                <Route path="/order/confirmation" element={<OrderSuccess />} />
                <Route path="/track-order" element={<TrackOrderPage />} />
                <Route path="/order/success-alt" element={<OrderConfirmation />} />
                <Route path="/store-pickup-success" element={<StorePickupSuccessPage />} />
                <Route path="*" element={<PageNotFound />} />
              </Routes>
            </main>
            <Footer />
            <RouteAwareFallingCart />
            <BackToTop />
            <WhatsAppButton
              phone={import.meta.env.VITE_WHATSAPP_NUMBER}
              text="Hi! I’d like to know more about your artworks and classes."
            />
            <DiscountPopup />
          </div>
          </SmoothScroll>
          <Toaster
            position="top-right"
            gutter={8}
            toastOptions={{
              duration: 3000,
              style: { fontSize: 14 }
            }}
          />
        </Router>
        </AnnouncementsProvider>
      </CartProvider>
    </PayPalScriptProvider>
  );
};

export default App;
