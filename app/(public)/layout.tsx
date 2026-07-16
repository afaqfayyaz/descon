/**
 * Public (unauthenticated) shell for secure tokenized assessment links.
 * Deliberately omits ProtectedLayout / requireSession — access is authorized
 * solely by the bearer token in the URL.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border bg-primary-800 px-6">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
          C
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          Caliber
        </span>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
