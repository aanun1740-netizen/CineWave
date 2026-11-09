import React from "react";
import { createRoot } from "react-dom/client";
import "./services/backend";
import Admin from "./Admin";
import "../admin/admin.css";
import "../player.css";
createRoot(document.getElementById("root")).render(<Admin />);
