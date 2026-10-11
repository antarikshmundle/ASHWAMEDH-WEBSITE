"use client";

import {
  createTeamMemberAction,
  deleteTeamMemberAction,
  reorderTeamAction,
  saveTeamMemberAction,
} from "@/app/admin/team/actions";
import type { AdminTeamMemberView } from "@/types/admin-collections";
import {
  ResultMessage,
  RowControls,
  STATUS_OPTIONS,
  SourceInputs,
  formObject,
  moved,
  primaryButton,
  useCollectionAction,
} from "./collection-ui";
import { Section, SelectField, TextField } from "./fields";

/**
 * Team manager (Phase 10.6): names, roles and groups of the official organising committee — no
 * photos, no personal contact details. Draft rows are not shown on the site.
 */

const EMPTY = { sourceKind: "", sourceReference: "", sourceDate: "" };

function MemberFields({
  idPrefix,
  values,
  errors,
}: {
  idPrefix: string;
  values: { name: string; role: string; groupLabel: string; status: string };
  errors: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        id={`${idPrefix}-name`}
        name="name"
        label="Name"
        maxLength={120}
        defaultValue={values.name}
        error={errors.name}
      />
      <TextField
        id={`${idPrefix}-role`}
        name="role"
        label="Role"
        maxLength={120}
        defaultValue={values.role}
        error={errors.role}
      />
      <TextField
        id={`${idPrefix}-group`}
        name="groupLabel"
        label="Group"
        maxLength={80}
        hint="As stated officially, e.g. the committee name."
        defaultValue={values.groupLabel}
        error={errors.groupLabel}
      />
      <SelectField
        id={`${idPrefix}-status`}
        name="status"
        label="Status"
        options={STATUS_OPTIONS}
        defaultValue={values.status}
        error={errors.status}
      />
    </div>
  );
}

function AddMember() {
  const { pending, result, run, errors } = useCollectionAction();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        run(
          () => createTeamMemberAction(formObject(form)),
          () => form.reset(),
        );
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      <MemberFields
        idPrefix="new"
        values={{ name: "", role: "", groupLabel: "", status: "draft" }}
        errors={errors}
      />
      <SourceInputs idPrefix="new" values={EMPTY} errors={errors} />
      <div className="flex flex-wrap items-center gap-4" aria-live="polite">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Adding…" : "Add member"}
        </button>
        <ResultMessage result={result} success="Member added." />
      </div>
    </form>
  );
}

function MemberRow({
  member,
  index,
  order,
}: {
  member: AdminTeamMemberView;
  index: number;
  order: string[];
}) {
  const { pending, result, run, errors } = useCollectionAction();
  const label = `${member.name} (${member.role})`;
  return (
    <li className="rounded-lg border border-line-subtle p-4">
      <p className="type-meta text-fg-muted">
        {index + 1}. {member.status === "published" ? "Published" : "Draft"}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          run(() => saveTeamMemberAction(member.id, member.version, formObject(form)));
        }}
        className="mt-2 flex flex-col gap-4"
        noValidate
      >
        <MemberFields idPrefix={`m-${member.id}`} values={member} errors={errors} />
        <SourceInputs idPrefix={`m-${member.id}`} values={member} errors={errors} />
        <div className="flex flex-wrap items-center gap-4" aria-live="polite">
          <button type="submit" disabled={pending} className={primaryButton}>
            Save<span className="sr-only">: {label}</span>
          </button>
          <ResultMessage result={result} success="Saved." />
        </div>
      </form>
      <div className="mt-3">
        <RowControls
          label={label}
          index={index}
          count={order.length}
          disabled={pending}
          onMove={(by) => run(() => reorderTeamAction(moved(order, index, by)))}
          onDelete={() => {
            if (window.confirm(`Delete ${label}? This cannot be undone.`))
              run(() => deleteTeamMemberAction(member.id, member.version));
          }}
        />
      </div>
    </li>
  );
}

export function TeamManager({ members }: { members: AdminTeamMemberView[] }) {
  const order = members.map((m) => m.id);
  return (
    <div>
      <Section
        title="Add a member"
        description="Official names and roles only. New members start as Draft."
      >
        <AddMember />
      </Section>
      <section aria-labelledby="members-title" className="mt-10">
        <h2 id="members-title" className="type-title text-fg">
          Members ({members.length})
        </h2>
        <p className="mt-1 type-body-sm text-fg-muted">
          The site groups published members by group, in this order. With none published, the Team
          page shows “Organising committee will be announced.”
        </p>
        {members.length === 0 ? (
          <p className="mt-4 type-body-sm text-fg-muted">No members yet.</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-4">
            {members.map((member, i) => (
              <MemberRow
                key={`${member.id}-${member.version}`}
                member={member}
                index={i}
                order={order}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
