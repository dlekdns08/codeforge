const statusStyles: Record<string, string> = {
  success: 'bg-success/15 text-success',
  failure: 'bg-danger/15 text-danger',
  running: 'bg-info/15 text-info',
  pending: 'bg-warning/15 text-warning',
  skipped: 'bg-text-muted/15 text-text-muted',
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || statusStyles.pending;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}
