import type { Metadata } from "next";

/**
 * Admin area shell (Phase 10.1). Deliberately plain and outside the public chrome
 * (src/components/layout/public-chrome.tsx). No auth check here — layouts do not re-run on
 * navigation, so every admin page calls `requireAdmin()` itself.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · ASHWAMEDH Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div data-vertical="brand" className="container-site max-w-3xl py-10 lg:py-16">
      {children}
    </div>
  );
}
