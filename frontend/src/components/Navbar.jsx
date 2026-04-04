import { NavLink } from "react-router-dom";

import { useContract } from "@/hooks/useContract";
import { ROUTES } from "@/utils/constants";
import WalletConnectButton from "./WalletConnectButton";

const links = [
  { to: ROUTES.analytics, label: "Analytics" },
  { to: ROUTES.marketplace, label: "Marketplace" },
  { to: ROUTES.borrow, label: "Borrow" },
  { to: ROUTES.lend, label: "Lend" },
  { to: ROUTES.history, label: "History" },
  { to: ROUTES.profile, label: "Profile" }
];

export default function Navbar() {
  const { account, isConnected, isConnecting, connectWallet, disconnectWallet } = useContract();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-accent/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to={ROUTES.landing} className="text-xl font-black tracking-tight text-text">
          DecentraLend
        </NavLink>

        <nav className="hidden items-center gap-4 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive ? "bg-primary/20 text-primary" : "text-text/80 hover:text-text"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <WalletConnectButton
          connectWallet={connectWallet}
          disconnectWallet={disconnectWallet}
          account={account}
          isConnected={isConnected}
          isConnecting={isConnecting}
        />
      </div>
    </header>
  );
}
