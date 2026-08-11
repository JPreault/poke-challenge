import { HeaderNav } from "@/components/layout/HeaderNav";

export function AppHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-999 pt-4">
      <div className="flex h-12 items-center justify-end gap-2 px-4 sm:px-6">
        <HeaderNav />
      </div>
    </header>
  );
}
