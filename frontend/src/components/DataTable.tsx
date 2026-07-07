import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  empty,
}: DataTableProps<T>) {
  if (!data.length) {
    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-card)",
        }}
      >
        <div
          className="p-8 text-center text-sm"
          style={{ color: "var(--color-muted)" }}
        >
          {empty || "No records found."}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-card)",
      }}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    width: col.width,
                    color: "var(--color-text-secondary)",
                  }}
                  className="px-4 py-2.5 font-medium text-xs uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className="divide-y"
            style={{
              borderColor: "var(--color-border)",
              ["--tw-divide-opacity" as any]: 0.5,
              ["--tw-divide-color" as any]: "var(--color-border)",
            }}
          >
            {data.map((row, idx) => (
              <tr
  key={idx}
  onClick={() => onRowClick?.(row)}
  className={`border-b transition-colors duration-150 ${
    onRowClick
      ? "cursor-pointer hover:bg-[var(--color-hover)]"
      : "cursor-default"
  }`}
  style={{
    borderColor: "var(--color-border)",
  }}
>
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-4 py-2"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {typeof col.accessor === "function"
                      ? col.accessor(row)
                      : String(
                          (row as Record<string, unknown>)[
                            col.accessor as string
                          ] ?? "—",
                        )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
