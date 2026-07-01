interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-12 text-center">
      <div className="max-w-sm">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
