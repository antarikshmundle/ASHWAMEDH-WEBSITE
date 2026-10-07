"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AshwamedhLogo, PceLogo } from "@/components/ui/logos";
import { isActive, primaryNav } from "@/data/navigation";
import { site } from "@/data/site";
import { HERO_LOGO_ID } from "@/lib/constants";

/**
 * Global navbar (docs/ux/navigation.md, docs/design-system/components.md → Navbar).
 * Hero state (homepage top): transparent, PCE logo. Sticky state (scrolled / inner pages): Ashwamedh logo.
 * Always uses the brand accent, even on vertical pages.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [heroInView, setHeroInView] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const heroState = isHome && heroInView;

  useEffect(() => {
    if (!isHome) return;
    const target = document.getElementById(HERO_LOGO_ID);
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroInView(entry?.isIntersecting ?? false),
      { rootMargin: "-72px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [isHome]);

  // Close the menu on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  return (
    <>
      <header data-vertical="brand" className="fixed inset-x-0 top-0 z-40">
        <div
          className={`absolute inset-0 -z-10 transition-[background-color,border-color,backdrop-filter] duration-240 ease-[var(--ease-standard)] ${
            heroState
              ? "border-b border-transparent bg-gradient-to-b from-base/60 to-transparent"
              : "border-b border-line-subtle bg-raised/82 backdrop-blur-md"
          }`}
        />
        <div
          className={`container-site flex items-center justify-between gap-6 transition-[height] duration-240 ${
            heroState ? "h-16 xl:h-20" : "h-16 xl:h-[72px]"
          }`}
        >
          <LogoBlock heroState={heroState} />

          {/* Full desktop nav from xl (1280 px); below that the menu button is used (avoids crowding at 1024–1279). */}
          <nav aria-label="Primary" className="hidden xl:block">
            <ul className="flex items-center gap-1 min-[1360px]:gap-3">
              {primaryNav.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex h-11 items-center px-2.5 type-nav whitespace-nowrap transition-colors duration-150 min-[1360px]:px-3 ${
                        active ? "text-fg" : "text-fg-secondary hover:text-fg"
                      }`}
                    >
                      {item.label}
                      {active && (
                        <span
                          aria-hidden
                          className="absolute bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            {/* OD-12: status, not a link — not focusable, no hover. */}
            <p className="hidden h-11 cursor-default items-center rounded-md border border-accent/55 px-5 type-button whitespace-nowrap text-fg xl:inline-flex">
              Coming Soon
            </p>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="inline-flex size-11 items-center justify-center rounded-md border border-line-control text-fg xl:hidden"
            >
              <Menu aria-hidden className="size-5" />
              <span className="sr-only">Open menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Spacer: inner pages start below the fixed bar; the homepage hero sits under it. */}
      {!isHome && <div aria-hidden className="h-16 xl:h-[72px]" />}

      {menuOpen && <MobileMenu pathname={pathname} onClose={() => setMenuOpen(false)} />}
    </>
  );
}

function LogoBlock({ heroState }: { heroState: boolean }) {
  return (
    <div className="relative flex h-14 min-w-[150px] items-center">
      {/* Hero state: PCE logo on plate + college name */}
      <Link
        href="/"
        inert={!heroState}
        aria-hidden={!heroState}
        className={`flex items-center gap-3 transition-opacity duration-240 ${
          heroState ? "opacity-100" : "pointer-events-none absolute opacity-0"
        }`}
      >
        <span className="flex xl:hidden">
          <PceLogo height={36} alt="" eager />
        </span>
        <span className="hidden xl:flex">
          <PceLogo height={40} alt="" eager />
        </span>
        <span className="hidden flex-col type-micro leading-snug tracking-[0.08em] whitespace-nowrap text-fg sm:flex">
          <span>Priyadarshini College of Engg.</span>
          <span className="text-fg-secondary">Nagpur</span>
        </span>
        <span className="sr-only">
          {site.college}, {site.city} — Home
        </span>
      </Link>

      {/* Sticky / inner-page state: Ashwamedh logo */}
      <Link
        href="/"
        inert={heroState}
        aria-hidden={heroState}
        className={`flex flex-col items-center transition-opacity duration-240 ${
          heroState ? "pointer-events-none absolute opacity-0" : "opacity-100"
        }`}
      >
        <AshwamedhLogo width={92} alt="ASHWAMEDH 2026, home" className="xl:hidden" eager />
        <AshwamedhLogo width={104} alt="ASHWAMEDH 2026, home" className="hidden xl:block" eager />
      </Link>
    </div>
  );
}

function MobileMenu({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>("a[href], button");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [onKeyDown]);

  return (
    <div
      id="mobile-menu"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      data-vertical="brand"
      className="fixed inset-0 z-50 flex enter-fade flex-col overflow-y-auto bg-base/96 backdrop-blur-md [animation-duration:400ms] xl:hidden"
    >
      <div className="container-site flex h-16 shrink-0 items-center justify-between">
        <AshwamedhLogo width={120} alt="" />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex size-11 items-center justify-center rounded-md border border-line-control text-fg"
        >
          <X aria-hidden className="size-5" />
          <span className="sr-only">Close menu</span>
        </button>
      </div>

      <nav aria-label="Primary" className="container-site flex-1 pt-6">
        <ul className="flex flex-col">
          {primaryNav.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.href} className="border-b border-line-subtle">
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 items-center gap-3 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide ${
                    active ? "text-fg" : "text-fg-secondary"
                  }`}
                >
                  {active && <span aria-hidden className="h-6 w-0.5 rounded-full bg-accent" />}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="container-site flex flex-col gap-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <p className="flex h-12 cursor-default items-center justify-center rounded-md border border-accent/55 type-button text-fg">
          Coming Soon
        </p>
        <div className="flex items-center gap-3">
          <PceLogo height={36} />
          <span className="type-micro leading-snug tracking-[0.08em] text-fg-secondary">
            {site.college}, {site.city}
          </span>
        </div>
      </div>
    </div>
  );
}
