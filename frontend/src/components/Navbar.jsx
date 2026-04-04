import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NavLink } from "react-router-dom";

import NavCreditBadge from "@/components/NavCreditBadge";
import { useTheme } from "@/context/ThemeContext";
import { ROUTES } from "@/utils/constants";

const links = [
  { to: ROUTES.analytics, label: "Analytics" },
  { to: ROUTES.marketplace, label: "Marketplace" },
  { to: ROUTES.dashboard, label: "Dashboard" },
  { to: ROUTES.lend, label: "Lend" },
  { to: ROUTES.dispute, label: "Disputes" },
  { to: ROUTES.history, label: "History" },
  { to: ROUTES.profile, label: "Profile" }
];

export default function Navbar() {
  const { toggleTheme, isDark } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-accent/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <NavLink
          to={ROUTES.landing}
          className="shrink-0 text-xl font-black tracking-tight text-slate-900 dark:text-text"
        >
          DecentraLend
        </NavLink>

        <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-slate-600 hover:text-slate-900 dark:text-text/80 dark:hover:text-text"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NavCreditBadge />
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl border border-slate-200/90 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/15 dark:text-text dark:hover:bg-white/10"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? "Light" : "Dark"}
          </button>
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>
      </div>
    </header>
  );
}
