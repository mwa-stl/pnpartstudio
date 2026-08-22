import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// Installs the auth interceptors on the shared axios instance before any
// page component gets a chance to make a request.
import './api/axios.js';
import App from './App';

// Bootstrap was removed deliberately: the console now defines its own
// .btn/.field/.panel primitives in index.css, and Bootstrap's identically
// named classes loaded afterwards and overrode them.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
