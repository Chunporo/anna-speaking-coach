import type { ReactNode } from "react";

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p className="font-semibold text-gray-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingCards() {
  return (
    <div
      role="status"
      aria-label="Đang tải nội dung"
      className="grid gap-4 sm:grid-cols-3"
    >
      {[0, 1, 2].map((item) => (
        <div key={item} className="surface">
          <div className="skeleton mb-5 h-3 w-24" />
          <div className="skeleton h-9 w-16" />
        </div>
      ))}
    </div>
  );
}
