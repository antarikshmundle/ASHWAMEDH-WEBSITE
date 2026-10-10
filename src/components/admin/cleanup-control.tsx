"use client";

import { useRouter } from "next/navigation";
import { useActionState, type FormEvent } from "react";
import { applyCleanupAction, type CleanupState } from "@/app/admin/files/actions";

/**
 * Delete button of the admin Files page (Phase 10.4.6). Asks for confirmation; the server
 * re-plans and re-checks everything, so the page list is only a preview.
 */
export function CleanupControl({ count }: { count: number }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (previous: CleanupState, data: FormData) => {
      const next = await applyCleanupAction(previous, data);
      router.refresh(); // show the new dry run
      return next;
    },
    { status: "idle", nonce: 0 } satisfies CleanupState,
  );

  const confirm = (event: FormEvent<HTMLFormElement>) => {
    const ok = window.confirm(
      `Permanently delete ${count} unused item${count === 1 ? "" : "s"}? Files used by an event, uploaded or removed within the last 24 hours, or part of an upload in progress are never deleted.`,
    );
    if (!ok) event.preventDefault();
  };

  return (
    <div className="mt-6">
      <form action={action} onSubmit={confirm}>
        <input type="hidden" name="confirm" value="delete-unused-files" />
        <button
          type="submit"
          disabled={pending || count === 0}
          className="h-12 rounded-md bg-accent-strong px-6 type-button text-on-accent hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Deleting…" : `Delete ${count} unused item${count === 1 ? "" : "s"}`}
        </button>
      </form>
      <div aria-live="polite" className="mt-4 empty:hidden">
        {state.status === "done" && (
          <div
            role={state.failures?.length ? "alert" : "status"}
            className="rounded-md border border-line bg-surface px-4 py-3 type-body-sm text-fg"
          >
            <p>
              Deleted {state.deleted!.files} unused file{state.deleted!.files === 1 ? "" : "s"},{" "}
              {state.deleted!.orphans} leftover object{state.deleted!.orphans === 1 ? "" : "s"} and{" "}
              {state.deleted!.staging} old upload{state.deleted!.staging === 1 ? "" : "s"}.
            </p>
            {(state.skipped?.length ?? 0) > 0 && (
              <p className="mt-1 text-fg-muted">
                Kept {state.skipped!.length} that changed since the check (still in use, uploading
                or no longer eligible).
              </p>
            )}
            {(state.failures?.length ?? 0) > 0 && (
              <p className="mt-1">
                {state.failures!.length} could not be deleted and will be retried by the next
                cleanup.
              </p>
            )}
          </div>
        )}
        {state.status === "error" && (
          <p
            role="alert"
            className="rounded-md border border-accent bg-surface-2 px-4 py-3 type-body-sm text-fg"
          >
            The cleanup could not run — nothing was deleted by this attempt. Try again later.
          </p>
        )}
        {state.status === "not-confirmed" && (
          <p
            role="alert"
            className="rounded-md border border-accent bg-surface-2 px-4 py-3 type-body-sm text-fg"
          >
            Nothing was deleted: the request was not confirmed.
          </p>
        )}
      </div>
    </div>
  );
}
