"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { getSettingsForEdit, saveSettings } from "@/lib/cms/admin-settings";
import { expireFestivalSettings } from "@/lib/cms/revalidate";
import {
  parseSettingsForm,
  rowToFormValues,
  validateSettingsForm,
  type SettingsFormValues,
} from "@/lib/cms/settings-form";

/**
 * Festival settings Server Action (Phase 10.5): admin session, server-side validation, atomic
 * versioned save (cms_save_settings), then a refresh of the pages that show settings.
 */

export interface SettingsState {
  status: "idle" | "saved" | "invalid" | "conflict" | "missing" | "error";
  version: string;
  nonce: number;
  values?: SettingsFormValues;
  errors?: Record<string, string>;
}

export async function saveSettingsAction(
  previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireAdmin();
  const nonce = (previous?.nonce ?? 0) + 1;
  const version = String(formData.get("version") ?? "");
  const values = parseSettingsForm(formData);
  const checked = validateSettingsForm(values);
  if (!checked.ok) return { status: "invalid", version, nonce, values, errors: checked.errors };

  let outcome;
  try {
    outcome = await saveSettings(version, checked.payload);
  } catch (error) {
    console.error(`[cms] saving festival settings failed: ${(error as Error).message}`);
    return { status: "error", version, nonce, values };
  }
  if (!outcome.ok) {
    const map = { conflict: "conflict", missing: "missing", failed: "error" } as const;
    return { status: map[outcome.reason], version, nonce, values };
  }
  await expireFestivalSettings();
  let saved = values;
  try {
    saved = rowToFormValues(await getSettingsForEdit());
  } catch {
    // The save succeeded; the form shows the submitted values until the next load.
  }
  return { status: "saved", version: outcome.version, nonce, values: saved };
}
