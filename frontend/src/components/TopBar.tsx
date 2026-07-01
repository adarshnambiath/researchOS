import { useLocation } from "react-router-dom";

const pathToTitle: Record<string, string> = {
  "/": "Home",
  "/datasets": "Datasets",
  "/experiments": "Experiments",
  "/runs": "Runs",
};

export function TopBar() {
  const location = useLocation();
  const title =
    pathToTitle[location.pathname] || location.pathname.split("/").filter(Boolean).pop();

  return (
    <header className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="flex h-full items-center px-6">
        <h1 className="text-sm font-medium text-gray-500">
          {title ? title.charAt(0).toUpperCase() + title.slice(1) : "Research OS"}
        </h1>
      </div>
    </header>
  );
}
