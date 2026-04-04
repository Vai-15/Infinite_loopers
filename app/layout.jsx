import { LendwiseProvider } from "@/components/LendwiseProvider";
import FundsReceivedModal from "@/components/FundsReceivedModal";
import NotificationContainer from "@/components/NotificationContainer";

import "./globals.css";

export const metadata = {
  title: "Lendwise AI",
  description: "Decentralized lending with MetaMask"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <LendwiseProvider>
          {children}
          <NotificationContainer />
          <FundsReceivedModal />
        </LendwiseProvider>
      </body>
    </html>
  );
}
