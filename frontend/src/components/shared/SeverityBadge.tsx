const severityStyles: Record<string, string> = {
  critical: 'bg-danger/15 text-danger',
  high: 'bg-danger/10 text-red-400',
  medium: 'bg-warning/15 text-warning',
  low: 'bg-success/15 text-success',
  info: 'bg-info/15 text-info',
};

export function SeverityBadge({ severity }: { severity: string }) {
  const style = severityStyles[severity] || severityStyles.info;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {severity}
    </span>
  );
}
