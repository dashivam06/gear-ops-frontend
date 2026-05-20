import React from "react";

export function UserHeader({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-zinc-200 pb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">{subtitle}</p>
      </div>
      {children ? <div>{children}</div> : null}
    </div>
  );
}
