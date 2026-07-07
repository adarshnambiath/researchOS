import { useLocation } from "react-router-dom";

const pathToTitle: Record<string, string> = {
  "/": "Home",
  "/datasets": "Datasets",
  "/experiments": "Experiments",
  "/runs": "Runs",
};

export function TopBar() {
  return (
    <header
      className="h-16 flex items-center px-6"
      style={{
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <h1 className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
        Research OS
      </h1>
    </header>
  );
}
