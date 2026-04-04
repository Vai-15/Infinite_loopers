import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { Web3Provider } from "@/context/Web3Context";
import { wagmiConfig } from "@/config/wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import "@/styles/index.css";

const queryClient = new QueryClient();

function RootProviders() {
  const { isDark } = useTheme();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={isDark ? darkTheme() : lightTheme()}>
          <Web3Provider>
            <App />
            <Toaster position="top-right" />
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <RootProviders />
    </ThemeProvider>
  </React.StrictMode>
);
