import type { ReactNode } from "react";

/** Standard page header for every authenticated screen. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="sb-page-header">
      <div>
        {eyebrow ? <span className="sb-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="sb-actions" style={{ marginTop: 0 }}>{actions}</div> : null}
    </header>
  );
}
