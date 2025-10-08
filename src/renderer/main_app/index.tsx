
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import {config} from "../env.config";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found");
}
// console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
// console.log('import.meta.env:', import.meta.env);
const root = createRoot(container);
root.render(
  <React.StrictMode>
    
    <App />
  </React.StrictMode>
);


