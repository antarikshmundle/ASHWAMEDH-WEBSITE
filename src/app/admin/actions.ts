"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_HOME,
  checkCredentials,
  endAdminSession,
  LOGIN_PATH,
  startAdminSession,
} from "@/lib/admin/auth";
import { readAdminConfig } from "@/lib/admin/config";
import {
  clearLoginFailures,
  clientKey,
  isLoginLocked,
  recordLoginFailure,
} from "@/lib/admin/rate-limit";

/**
 * Admin sign-in / sign-out (Phase 10.1). Next.js already rejects cross-origin Server Action
 * requests (Origin vs Host); these actions add credential checks and throttling.
 */

export async function loginAction(formData: FormData): Promise<void> {
  const config = readAdminConfig();
  if (!config) redirect(`${LOGIN_PATH}?error=config`);

  const client = clientKey(await headers());
  if (isLoginLocked(client)) redirect(`${LOGIN_PATH}?error=locked`);

  const ok = await checkCredentials(formData.get("username"), formData.get("password"), config);
  if (!ok) {
    recordLoginFailure(client);
    redirect(`${LOGIN_PATH}?error=${isLoginLocked(client) ? "locked" : "invalid"}`);
  }

  clearLoginFailures(client);
  await startAdminSession(config);
  redirect(ADMIN_HOME);
}

export async function logoutAction(): Promise<void> {
  await endAdminSession();
  redirect(`${LOGIN_PATH}?signedOut=1`);
}
