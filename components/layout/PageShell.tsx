export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full flex-1">
      <div aria-hidden className="pointer-events-none fixed inset-0 app-bg" />
      <div className="relative z-10 flex min-h-full flex-col">{children}</div>
    </div>
  );
}
