"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { getStoredSession } from "@/lib/demo-store";

const SETTINGS_KEY = "vne-settings";

type SettingsState = {
  theme: "system" | "light" | "dark";
  defaultMode: "lecture" | "meeting" | "creator" | "podcast";
  exportFormat: "markdown" | "pdf" | "docx" | "json";
  realtimeUpdates: boolean;
};

const defaultSettings: SettingsState = {
  theme: "system",
  defaultMode: "lecture",
  exportFormat: "markdown",
  realtimeUpdates: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        setSettings(JSON.parse(raw) as SettingsState);
      } catch {
        window.localStorage.removeItem(SETTINGS_KEY);
      }
    }
    setProfile(getStoredSession());
  }, []);

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function onSave() {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
  }

  return (
    <main className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Settings</p>
        <h1 className="mt-3 text-4xl font-bold">Workspace preferences</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          Control how the browser workspace behaves while the standalone deployment is running without an attached backend service.
        </p>

        <div className="mt-8 grid gap-6">
          <div>
            <p className="text-sm font-semibold">Theme preference</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["system", "light", "dark"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("theme", value)}
                  className={`rounded-full border px-4 py-2 text-sm ${settings.theme === value ? "border-accent bg-accent/10" : "border-border"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Default extraction mode</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(["lecture", "meeting", "creator", "podcast"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("defaultMode", value)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm ${settings.defaultMode === value ? "border-accent bg-accent/10" : "border-border"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Preferred export</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["markdown", "pdf", "docx", "json"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("exportFormat", value)}
                  className={`rounded-full border px-4 py-2 text-sm ${settings.exportFormat === value ? "border-accent bg-accent/10" : "border-border"}`}
                >
                  {value.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between rounded-[22px] border border-border px-4 py-4 text-sm">
            <span>Enable realtime processing updates</span>
            <input
              type="checkbox"
              checked={settings.realtimeUpdates}
              onChange={(event) => update("realtimeUpdates", event.target.checked)}
              className="h-4 w-4"
            />
          </label>

          <button
            type="button"
            onClick={onSave}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
          >
            <Save className="h-4 w-4" />
            Save settings
          </button>
          {saved ? <p className="text-sm text-emerald-600">Settings saved in this browser workspace.</p> : null}
        </div>
      </Card>

      <div className="grid gap-6">
        <Card className="p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-muted">Profile</p>
          <h2 className="mt-3 text-2xl font-bold">Current session</h2>
          <div className="mt-4 text-sm leading-7 text-muted">
            {profile ? (
              <>
                <p>{profile.name}</p>
                <p>{profile.email}</p>
              </>
            ) : (
              <p>No active sign-in yet. Use the sign-in page to create a local session for this deployment.</p>
            )}
          </div>
        </Card>
        <Card className="p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-muted">Runtime</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
            <p>Video URL, file upload, and meeting audio flows are active in-browser for this deployment.</p>
            <p>Each extraction progresses through queued, processing, transcribing, indexing, and summarizing states before completion.</p>
            <p>The repo still contains the full FastAPI, worker, ffmpeg, yt-dlp, OpenAI, and Qdrant backend path for attaching a live server later.</p>
          </div>
        </Card>
      </div>
    </main>
  );
}
