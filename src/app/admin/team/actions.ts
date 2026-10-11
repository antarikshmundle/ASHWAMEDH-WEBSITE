"use server";

import { requireAdmin } from "@/lib/admin/auth";
import {
  createTeamMember,
  deleteTeamMember,
  reorderCollection,
  saveTeamMember,
  type CollectionOutcome,
} from "@/lib/cms/collections";

/**
 * Team Server Actions (Phase 10.6): names and roles only — no photos, no personal contact details.
 * Each re-checks the admin session; the service validates everything again.
 */

export type { CollectionOutcome };

const text = (value: unknown) => (typeof value === "string" ? value : "");
const member = (input: Record<string, unknown> | undefined) => ({
  name: text(input?.name),
  role: text(input?.role),
  groupLabel: text(input?.groupLabel),
  status: text(input?.status),
  sourceKind: text(input?.sourceKind),
  sourceReference: text(input?.sourceReference),
  sourceDate: text(input?.sourceDate),
});

export async function createTeamMemberAction(
  input: Record<string, unknown>,
): Promise<CollectionOutcome> {
  await requireAdmin();
  return createTeamMember(member(input));
}

export async function saveTeamMemberAction(
  id: string,
  version: string,
  input: Record<string, unknown>,
): Promise<CollectionOutcome> {
  await requireAdmin();
  return saveTeamMember(text(id), text(version), member(input));
}

export async function deleteTeamMemberAction(
  id: string,
  version: string,
): Promise<CollectionOutcome> {
  await requireAdmin();
  return deleteTeamMember(text(id), text(version));
}

export async function reorderTeamAction(order: unknown): Promise<CollectionOutcome> {
  await requireAdmin();
  return reorderCollection("team", Array.isArray(order) ? order.map(text) : []);
}
