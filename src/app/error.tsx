"use client"; // Error boundaries must be Client Components

import { RotateCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { ArrowLink, PrimaryButton } from "@/components/ui/button";

/**
 * Branded error boundary for unexpected runtime errors (same layout as not-found.tsx).
 * The header and footer stay in place, so the visitor can also navigate away.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      data-vertical="brand"
      className="container-site flex min-h-[60vh] flex-col items-center justify-center gap-6 py-20 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full border border-line-control">
        <TriangleAlert aria-hidden strokeWidth={1.5} className="size-5 text-accent" />
      </span>
      <h1 className="type-h2 text-fg">Something went wrong</h1>
      <p className="type-body text-fg-muted">This page couldn&apos;t load. Please try again.</p>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <PrimaryButton onClick={retry} icon={<RotateCw aria-hidden className="size-[18px]" />}>
          Try again
        </PrimaryButton>
        <ArrowLink href="/">Go to Home</ArrowLink>
      </div>
    </div>
  );
}
