interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg p-12 text-center"
      style={{
        border: "1px dashed var(--color-border)",
        backgroundColor: "var(--color-card)",
      }}
    >
      <div className="max-w-sm">
        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{title}</p>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
