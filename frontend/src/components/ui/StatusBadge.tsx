/**
 * StatusBadge — Canonical status pill component.
 *
 * Extracted from page.tsx (where it lived as a page-level export) into its
 * own component file so it can be properly imported by both the dashboard
 * and the runs list without creating a cross-page import dependency.
 */

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`status-${status} inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium`}
    >
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 pulse-dot" />
      )}
      {status === 'sleeping' && (
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
      )}
      {status}
    </span>
  );
}
