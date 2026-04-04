import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { Web3Provider } from "@/context/Web3Context";
import "@/styles/index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <App />
        <Toaster position="top-right" />
      </Web3Provider>
    </QueryClientProvider>
  </React.StrictMode>
);
