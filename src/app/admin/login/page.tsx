import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/admin/actions";
import { ADMIN_HOME, getAdminSession } from "@/lib/admin/auth";
import { readAdminConfig } from "@/lib/admin/config";

export const metadata: Metadata = { title: "Sign in" };

const messages: Record<string, string> = {
  invalid: "Incorrect username or password.",
  locked: "Too many failed attempts. Try again in 15 minutes.",
  config: "Admin sign-in is not configured on this server.",
};

const field =
  "mt-2 block h-12 w-full rounded-md border border-line-control bg-base px-4 type-body text-fg";

/** Admin sign-in (Phase 10.1). A plain form posting to a Server Action — works without JS. */
export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getAdminSession()) redirect(ADMIN_HOME);

  const { error, signedOut } = await searchParams;
  const configured = readAdminConfig() !== null;
  const message = !configured
    ? messages.config
    : typeof error === "string"
      ? messages[error]
      : null;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="type-h2 text-fg">ASHWAMEDH Admin</h1>
      <p className="mt-2 type-body text-fg-secondary">Sign in to manage festival content.</p>

      {message && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-line-strong bg-surface-2 px-4 py-3 type-body-sm text-fg"
        >
          {message}
        </p>
      )}
      {!message && signedOut === "1" && (
        <p
          role="status"
          className="mt-6 rounded-md border border-line bg-surface px-4 py-3 type-body-sm text-fg-secondary"
        >
          You have been signed out.
        </p>
      )}

      <form
        action={loginAction}
        className="mt-8 flex flex-col gap-5 rounded-xl border border-line bg-surface p-6"
      >
        <label className="type-label text-fg-secondary">
          Username
          <input
            name="username"
            type="text"
            autoComplete="username"
            required
            maxLength={64}
            disabled={!configured}
            className={field}
          />
        </label>
        <label className="type-label text-fg-secondary">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
            disabled={!configured}
            className={field}
          />
        </label>
        <button
          type="submit"
          disabled={!configured}
          className="mt-2 h-12 rounded-md bg-accent-strong px-6 type-button text-on-accent hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
