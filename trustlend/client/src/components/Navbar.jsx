import { NavLink } from "react-router-dom";
import WalletConnectButton from "./WalletConnectButton";

const links = [
    { to: "/marketplace", label: "Marketplace" },
    { to: "/borrow", label: "Borrow" },
    { to: "/lend", label: "Lend" },
    { to: "/history", label: "History" }
];

export default function Navbar() {
    return (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-accent/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <NavLink to="/" className="text-xl font-black tracking-tight text-text">
                    TrustLend
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

                <WalletConnectButton />
            </div>
        </header>
    );
}
