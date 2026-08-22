import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header'; // rename from Navbar to Header, or update if still Navbar

const NAVBAR_HEIGHT = 80; // adjust if your Header component is a different height (px)

const Layout = () => (
  <>
    {/* Fixed header: must match header className in Header.jsx */}
    <Header />

    {/* Push content below the header */}
    <main className="w-full" style={{ paddingTop: `${NAVBAR_HEIGHT}px`, minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}>
      <Outlet />
    </main>
  </>
);

export default Layout;
