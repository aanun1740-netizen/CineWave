import React from "react";
import { createRoot } from "react-dom/client";
import "./services/backend";
import App from "./App";
import "../storefront.css";
import "../player.css";
import "../accounts.css";
import "../theme.css";
createRoot(document.getElementById("root")).render(<App />);
