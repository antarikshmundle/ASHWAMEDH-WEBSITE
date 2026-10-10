import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleList } from "@/components/sections/schedule-list";
import { ContactList } from "@/components/ui/contact-list";
import { SocialLinks } from "@/components/ui/social-links";
import { contact, culturalNight, scheduleRows, socialLinks } from "@/data/festival";
import { verticals } from "@/data/verticals";
import {
  parseSettingsForm,
  rowToFormValues,
  rowToSettings,
  validateSettingsForm,
  type FestivalSettingsRow,
  type SettingsFormValues,
} from "@/lib/cms/settings-form";
import { repositorySettings } from "@/lib/festival-settings";

/** Phase 10.5 festival settings: mapping, validation, loader, save action, rendering. */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const TODAY = new Date("2026-10-11T06:00:00Z");
const empty = () => rowToFormValues(null);
const SOURCE = {
  sourceKind: "owner-confirmed",
  sourceReference: "Fest committee",
  sourceDate: "2026-10-10",
};
const row = (over: Partial<FestivalSettingsRow> = {}): FestivalSettingsRow =>
  ({
    contact_phone: null,
    contact_whatsapp: null,
    contact_email: null,
    social_links: [],
    cultural_night_day1_date: null,
    cultural_night_day2_date: null,
    source_kind: null,
    source_reference: null,
    source_date: null,
    ...over,
  }) as FestivalSettingsRow;

describe("repository defaults and mapping", () => {
  it("defaults are exactly today's repository values (all TBA / empty)", () => {
    expect(repositorySettings.contact).toEqual(contact);
    expect(repositorySettings.socialLinks).toBe(socialLinks);
    expect(repositorySettings.culturalNightDates).toEqual(culturalNight.nights.map((n) => n.date));
    for (const r of scheduleRows)
      expect(repositorySettings.schedule[r.key]).toEqual({ time: r.time, venue: r.venue });
    for (const v of verticals) expect(repositorySettings.taglines[v.id]).toBe(v.tagline);
    expect(rowToSettings(null)).toBe(repositorySettings);
  });

  it("maps a stored row; never passes on a non-https link", () => {
    const settings = rowToSettings(
      row({
        contact_email: "fest@pce.edu.in",
        social_links: [
          { label: "Instagram", href: "https://instagram.com/ashwamedh" },
          { label: "Bad", href: "http://x.com" },
        ],
        cultural_night_day2_date: "13 Feb 2027",
        schedule_cultural_night_venue: "Main Lawn",
        tagline_cultural_night: "Two nights",
      }),
    );
    expect(settings.contact.email).toBe("fest@pce.edu.in");
    expect(settings.socialLinks).toEqual([
      { label: "Instagram", href: "https://instagram.com/ashwamedh" },
    ]);
    expect(settings.culturalNightDates).toEqual([null, "13 Feb 2027"]);
    expect(settings.schedule["cultural-night"]).toEqual({ time: null, venue: "Main Lawn" });
    expect(settings.taglines["cultural-night"]).toBe("Two nights");
  });
});

describe("validateSettingsForm", () => {
  it("an empty form saves all NULL without a source", () => {
    const result = validateSettingsForm(empty(), TODAY);
    expect(result.ok).toBe(true);
    const payload = (result as { payload: Record<string, unknown> }).payload;
    expect(Object.values(payload).filter((v) => v !== null && !Array.isArray(v))).toEqual([]);
    expect(payload.social_links).toEqual([]);
  });

  it("produces exactly the columns cms_save_settings writes", () => {
    const sql = readFileSync("supabase/migrations/20261011120000_cms_settings.sql", "utf8");
    const update = sql.slice(
      sql.indexOf("update public.festival_settings set"),
      sql.indexOf("where id = 1", sql.indexOf("update public.festival_settings set")),
    );
    const columns = [...update.matchAll(/^\s+(\w+) = /gm)].map((m) => m[1]).sort();
    const result = validateSettingsForm(empty(), TODAY) as { payload: Record<string, unknown> };
    expect(Object.keys(result.payload).sort()).toEqual(columns);
  });

  it("needs the official source as soon as anything is entered", () => {
    const values = { ...empty(), contactEmail: "fest@pce.edu.in" };
    const result = validateSettingsForm(values, TODAY);
    expect(result.ok).toBe(false);
    expect(Object.keys((result as { errors: object }).errors).sort()).toEqual([
      "sourceDate",
      "sourceKind",
      "sourceReference",
    ]);
    expect(validateSettingsForm({ ...values, ...SOURCE }, TODAY).ok).toBe(true);
    expect(
      validateSettingsForm({ ...values, ...SOURCE, sourceDate: "2026-10-20" }, TODAY),
    ).toMatchObject({
      ok: false,
      errors: { sourceDate: expect.stringMatching(/future/) },
    });
  });

  it("uses the site's contact rules and accepts only https social links", () => {
    const check = (over: Partial<SettingsFormValues>) =>
      validateSettingsForm({ ...empty(), ...SOURCE, ...over }, TODAY);
    expect(check({ contactPhone: "call us" })).toMatchObject({
      ok: false,
      errors: { contactPhone: expect.any(String) },
    });
    expect(check({ contactWhatsapp: "98765 43210" })).toMatchObject({
      ok: false,
      errors: { contactWhatsapp: expect.stringMatching(/international/) },
    });
    expect(check({ contactEmail: "nope" })).toMatchObject({
      ok: false,
      errors: { contactEmail: expect.any(String) },
    });
    for (const href of [
      "http://instagram.com/x",
      "javascript:alert(1)",
      "https://user:pw@x.com",
      "https://localhost",
      "https://x.com/a b",
    ])
      expect(check({ socialLinks: [{ label: "X", href }] }), href).toMatchObject({
        ok: false,
        errors: { "social.0.href": expect.any(String) },
      });
    expect(check({ socialLinks: [{ label: "", href: "https://x.com" }] })).toMatchObject({
      errors: { "social.0.label": expect.any(String) },
    });
    expect(
      check({
        socialLinks: Array.from({ length: 9 }, () => ({ label: "X", href: "https://x.com" })),
      }),
    ).toMatchObject({
      errors: { socialLinks: expect.any(String) },
    });
    const ok = check({
      contactPhone: " +91 98765  43210 ",
      socialLinks: [
        { label: "", href: "" },
        { label: " Instagram ", href: "https://instagram.com/ashwamedh" },
      ],
    });
    expect(ok).toMatchObject({
      ok: true,
      payload: {
        contact_phone: "+91 98765 43210",
        social_links: [{ label: "Instagram", href: "https://instagram.com/ashwamedh" }],
      },
    });
  });

  it("round-trips through the form fields", () => {
    const values: SettingsFormValues = {
      ...empty(),
      ...SOURCE,
      contactEmail: "fest@pce.edu.in",
      socialLinks: [{ label: "Instagram", href: "https://instagram.com/a" }],
      culturalNightDay1: "12 Feb 2027",
      schedule: { ...empty().schedule, sports: { time: "9:00 AM", venue: "Sports Ground" } },
      taglines: { ...empty().taglines, technomedh: "Build it" },
    };
    const data = new FormData();
    for (const [k, v] of Object.entries(values)) if (typeof v === "string") data.set(k, v);
    for (const l of values.socialLinks) {
      data.append("socialLabel", l.label);
      data.append("socialHref", l.href);
    }
    for (const [k, v] of Object.entries(values.schedule)) {
      data.set(`schedule.${k}.time`, v.time);
      data.set(`schedule.${k}.venue`, v.venue);
    }
    for (const [k, v] of Object.entries(values.taglines)) data.set(`tagline.${k}`, v);
    expect(parseSettingsForm(data)).toEqual(values);
  });
});

/* ---------- rendering (props from the loader) ---------- */

describe("public rendering", () => {
  const html = (node: ReactNode) => renderToString(node).replace(/<!-- -->/g, "");
  it("shows schedule times / venues and TBA for the rest", () => {
    const markup = html(
      <ScheduleList
        schedule={{
          ...repositorySettings.schedule,
          sports: { time: "9:00 AM", venue: "Sports Ground" },
        }}
      />,
    );
    expect(markup).toContain("9:00 AM");
    expect(markup).toContain("Sports Ground");
    expect(markup.match(/TBA/g)!.length).toBeGreaterThan(0);
    expect(html(<ScheduleList schedule={repositorySettings.schedule} />)).not.toContain(
      "Sports Ground",
    );
  });
  it("links official contact values and renders only https social links", () => {
    const markup = html(
      <ContactList
        variant="cards"
        contact={{ phone: null, whatsapp: "+91 98765 43210", email: "fest@pce.edu.in" }}
      />,
    );
    expect(markup).toContain('href="https://wa.me/919876543210"');
    expect(markup).toContain('href="mailto:fest@pce.edu.in"');
    expect(html(<SocialLinks links={[]} />)).toBe("");
    const social = html(
      <SocialLinks
        links={[
          { label: "Instagram", href: "https://instagram.com/a" },
          { label: "Bad", href: "http://x.com" },
        ]}
      />,
    );
    expect(social).toContain("https://instagram.com/a");
    expect(social).not.toContain("http://x.com");
  });
});

/* ---------- loader and save action ---------- */

const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
const publicClient = vi.fn();
const rpc = vi.fn();
const updateTag = vi.fn();
class Redirect extends Error {}
let signedIn = true;
vi.mock("@/lib/admin/auth", () => ({
  requireAdmin: async () => {
    if (!signedIn) throw new Redirect("/admin/login");
    return { sub: "admin" };
  },
}));
vi.mock("next/cache", () => ({ updateTag: (t: string) => updateTag(t) }));
vi.mock("@/lib/cms/server", () => ({
  cmsPublicReadClient: (tags: string[]) => publicClient(tags),
  cmsAdminClient: () => ({ client: { rpc, from: () => query } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  signedIn = true;
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({
    data: {
      ...row({
        contact_email: "fest@pce.edu.in",
        source_kind: "owner-confirmed",
        source_reference: "x",
        source_date: "2026-10-10",
      }),
      updated_at: "V2",
    },
    error: null,
  });
  publicClient.mockReturnValue({ client: { from: () => query } });
  rpc.mockResolvedValue({ data: "V2", error: null });
});

describe("loadFestivalSettings", () => {
  it("repository mode: the repository values, no database", async () => {
    vi.resetModules();
    vi.stubEnv("CMS_CONTENT_SOURCE", "repository");
    const { loadFestivalSettings } = await import("@/lib/cms/settings");
    expect(await loadFestivalSettings()).toEqual(repositorySettings);
    expect(publicClient).not.toHaveBeenCalled();
  });
  it("database mode: one tagged read of the row; errors are not hidden", async () => {
    vi.resetModules();
    vi.stubEnv("CMS_CONTENT_SOURCE", "database");
    const { loadFestivalSettings } = await import("@/lib/cms/settings");
    expect((await loadFestivalSettings()).contact.email).toBe("fest@pce.edu.in");
    expect(publicClient).toHaveBeenCalledWith(["cms:settings"]);
    vi.resetModules();
    query.maybeSingle.mockResolvedValue({ data: null, error: { message: "down" } });
    const fresh = await import("@/lib/cms/settings");
    await expect(fresh.loadFestivalSettings()).rejects.toThrow(/Reading festival settings failed/);
    // Before the migration: the table is missing → repository values (with a warning).
    vi.resetModules();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    query.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "not found", code: "PGRST205" },
    });
    const before = await import("@/lib/cms/settings");
    expect(await before.loadFestivalSettings()).toEqual(repositorySettings);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("saveSettingsAction", () => {
  const form = (over: Record<string, string> = {}) => {
    const data = new FormData();
    data.set("version", "V1");
    for (const [k, v] of Object.entries(over)) data.set(k, v);
    return data;
  };
  const idle = { status: "idle" as const, version: "V1", nonce: 0 };

  it("needs the admin session; invalid input saves nothing", async () => {
    const { saveSettingsAction } = await import("@/app/admin/settings/actions");
    signedIn = false;
    await expect(saveSettingsAction(idle, form())).rejects.toBeInstanceOf(Redirect);
    signedIn = true;
    const state = await saveSettingsAction(idle, form({ contactEmail: "fest@pce.edu.in" }));
    expect(state.status).toBe("invalid");
    expect(rpc).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("saves through the versioned RPC and refreshes only the settings tag", async () => {
    const { saveSettingsAction } = await import("@/app/admin/settings/actions");
    const state = await saveSettingsAction(
      idle,
      form({ contactEmail: "fest@pce.edu.in", ...SOURCE }),
    );
    expect(state).toMatchObject({
      status: "saved",
      version: "V2",
      values: { contactEmail: "fest@pce.edu.in" },
    });
    expect(rpc).toHaveBeenCalledWith("cms_save_settings", {
      p_expected_updated_at: "V1",
      p_content: expect.objectContaining({
        contact_email: "fest@pce.edu.in",
        source_kind: "owner-confirmed",
      }),
    });
    expect(updateTag.mock.calls).toEqual([["cms:settings"]]);

    rpc.mockResolvedValueOnce({ data: null, error: { message: "cms_version_conflict" } });
    expect(
      (await saveSettingsAction(idle, form({ contactEmail: "fest@pce.edu.in", ...SOURCE }))).status,
    ).toBe("conflict");
  });
});
