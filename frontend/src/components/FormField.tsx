export function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-(--color-text-secondary)">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
      {children}
    </label>
  );
}