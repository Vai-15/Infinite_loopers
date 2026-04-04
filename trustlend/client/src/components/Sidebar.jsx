import { NavLink } from "react-router-dom";

const links = [
    { to: "/borrow", label: "Borrower", icon: "BR" },
    { to: "/lend", label: "Lender", icon: "LN" },
    { to: "/marketplace", label: "Market", icon: "MK" },
    { to: "/history", label: "History", icon: "TX" }
];

export default function Sidebar() {
    return (
        <aside className="w-full rounded-2xl border border-white/10 bg-accent/80 p-4 md:w-64">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-text/70">Dashboard</h2>
            <nav className="space-y-2">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                isActive
                                    ? "bg-primary/20 text-primary"
                                    : "text-text/80 hover:bg-white/5 hover:text-text"
                            }`
                        }
                    >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-card text-[10px] font-bold">
                            {link.icon}
                        </span>
                        <span>{link.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
