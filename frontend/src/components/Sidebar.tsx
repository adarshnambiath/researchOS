import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home", end: true, icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { to: "/datasets", label: "Datasets", icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" },
  { to: "/experiments", label: "Experiments", icon: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" },
];

export function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col"
      style={{
        width: "288px",
        backgroundColor: "var(--color-sidebar)",
        borderRight: "1px solid var(--color-border)",
      }}
    >
      <div
        className="flex items-center gap-2 px-6"
        style={{ height: "64px", borderBottom: "1px solid var(--color-border)" }}
      >
        <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Research OS
        </span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? "var(--color-primary)" : "transparent",
              color: isActive ? "#FFFFFF" : "var(--color-text-secondary)",
            })}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.7 }}
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div
        className="px-6 py-4"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          v0.1.0
        </p>
      </div>
    </aside>
  );
}
