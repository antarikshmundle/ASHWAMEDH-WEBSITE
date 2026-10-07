import { ArrowLink, PrimaryLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div
      data-vertical="brand"
      className="container-site flex min-h-[60vh] flex-col items-center justify-center gap-6 py-20 text-center"
    >
      <p className="type-display text-accent">404</p>
      <h1 className="type-h2 text-fg">Page not found</h1>
      <p className="type-body text-fg-muted">This page doesn&apos;t exist or has moved.</p>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <PrimaryLink href="/">Go to Home</PrimaryLink>
        <ArrowLink href="/events">Explore Events</ArrowLink>
      </div>
    </div>
  );
}
