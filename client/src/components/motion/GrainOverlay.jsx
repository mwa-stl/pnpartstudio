import React from "react";

// Fixed film-grain texture, mounted once globally (see App.jsx).
// Pure CSS (.grain-overlay in index.css) no canvas/JS cost.
const GrainOverlay = () => <div className="grain-overlay" aria-hidden="true" />;

export default GrainOverlay;
