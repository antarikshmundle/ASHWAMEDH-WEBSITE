"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { EditorState } from "@/app/admin/events/actions";
import type { EventMediaSummary } from "@/types/admin-media";
import { EventEditorForm, type EditorLimits } from "./event-editor-form";
import { MediaPanel } from "./media-panel";

/**
 * Event editor shell (Phase 10.4.5): the text form and the media panels share one version of the
 * event. After any successful change the page data is refreshed from the server and the form is
 * re-created from it (keyed by the stored version), so the next action always uses the current
 * version and current values (an upload can clear a linked path / guidelines link — D2). Notices
 * live here, so they survive that refresh.
 *
 * D7: media actions are disabled while the text form has unsaved changes. D3: files can be added
 * only once the content source is saved.
 */

type Values = NonNullable<EditorState["values"]>;
type Revision = NonNullable<EditorState["revisions"]>[number];

interface Props {
  slug: string;
  publicHref: string;
  values: Values;
  version: string;
  revisions: Revision[];
  media: EventMediaSummary;
  mediaLimits: {
    image: { maxBytes: number; types: string[] };
    guidelines: { maxBytes: number; types: string[] };
  };
  limits: EditorLimits;
}

export type Notice =
  | { kind: "saved" | "restored"; missing?: ("image" | "guidelines")[] }
  | { kind: "media"; message: string };

export function EventEditor(props: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const refresh = () => startRefresh(() => router.refresh());
  const onResult = (state: EditorState) => {
    if (state.status !== "saved" && state.status !== "restored") return;
    setNotice({ kind: state.status, missing: state.missingMedia });
    refresh();
  };
  const onMediaDone = (message: string) => {
    setNotice({ kind: "media", message });
    refresh();
  };

  // Every reason that applies is shown (D3 and D7 can both apply).
  const reasons = [
    refreshing && "Updating the page…",
    !props.media.hasSource &&
      "Save the event’s content source (in “Source of this information” above) before adding files.",
    dirty &&
      "You have unsaved text changes. Save them (or reload the page to discard them) before changing files — file changes apply immediately.",
  ].filter((reason): reason is string => Boolean(reason));
  // One media action at a time: the other panel waits.
  const panelBlocked = (own: boolean) => {
    const all = busy && !own ? [...reasons, "Another file change is in progress…"] : reasons;
    return all.length ? all.join(" ") : null;
  };
  const [active, setActive] = useState<"image" | "guidelines" | null>(null);

  return (
    <div>
      <div aria-live="polite" className="mt-6 empty:hidden">
        {notice && <NoticeMessage notice={notice} publicHref={props.publicHref} />}
      </div>

      <EventEditorForm
        key={props.version}
        slug={props.slug}
        publicHref={props.publicHref}
        initialValues={props.values}
        initialVersion={props.version}
        initialRevisions={props.revisions}
        hasGuidelinesFile={Boolean(props.media.guidelines)}
        limits={props.limits}
        onDirtyChange={setDirty}
        onResult={onResult}
        locked={busy || refreshing}
        afterForm={
          <section aria-labelledby="files-title" className="mt-12">
            <h2 id="files-title" className="type-title text-fg">
              Event files
            </h2>
            <p className="mt-1 type-body-sm text-fg-muted">
              Official files only. Changes here apply immediately — they are not part of “Save
              changes” — and the previous file stays in the version history.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {(["image", "guidelines"] as const).map((kind) => (
                <MediaPanel
                  key={`${kind}-${props.version}`}
                  slug={props.slug}
                  kind={kind}
                  file={kind === "image" ? props.media.image : props.media.guidelines}
                  linked={kind === "image" ? props.media.imagePath : props.media.guidelinesUrl}
                  version={props.version}
                  blockedReason={panelBlocked(active === kind)}
                  maxBytes={props.mediaLimits[kind].maxBytes}
                  types={props.mediaLimits[kind].types}
                  onBusyChange={(value) => {
                    setBusy(value);
                    setActive(value ? kind : null);
                  }}
                  onDone={onMediaDone}
                />
              ))}
            </div>
          </section>
        }
      />
    </div>
  );
}

export function NoticeMessage({ notice, publicHref }: { notice: Notice; publicHref: string }) {
  const box = "rounded-md border px-4 py-3 type-body-sm";
  const view = (
    <a
      href={publicHref}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-4"
    >
      View public page<span className="sr-only"> (opens in new tab)</span>
    </a>
  );
  if (notice.kind === "media")
    return (
      <p role="status" className={`${box} border-line bg-surface text-fg`}>
        {notice.message} {view}
      </p>
    );
  const missing = notice.missing ?? [];
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className={`${box} border-line bg-surface text-fg`}>
        {notice.kind === "saved" ? "Saved." : "Earlier version restored and saved."} The public
        event page shows it on its next visit. {view}
      </p>
      {missing.length > 0 && (
        <p role="alert" className={`${box} border-accent bg-surface-2 text-fg`}>
          The restored version used{" "}
          {missing
            .map((kind) => (kind === "image" ? "an event image" : "a guidelines PDF"))
            .join(" and ")}{" "}
          that no longer exists, so {missing.length > 1 ? "those slots were" : "that slot was"} left
          empty. Upload the official file again under “Event files” if it is still needed.
        </p>
      )}
    </div>
  );
}
