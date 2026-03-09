"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ServedResponse = {
  entity: {
    id: string;
    type: string;
    name: string;
    tags: string[];
    source_hints: string[];
  };
  profile: {
    id: string;
    title: string;
    hero_summary: string;
    sections: Array<{ heading: string; body: string }>;
    action_playbook: Array<{ step: string; detail: string }>;
    reading_prompts: string[];
    sources: string[];
    version: number;
    generated_at: string;
    generation_source?: string;
  };
  generation_source?: string;
  served_at: string;
};

export default function BillionairesPage() {
  const [data, setData] = useState<ServedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = data?.profile.sections ?? [];
  const actionPlaybook = data?.profile.action_playbook ?? [];
  const readingPrompts = data?.profile.reading_prompts ?? [];
  const normalizeHeading = (heading: string) => heading.trim().toLowerCase();
  const educationSection = sections.find(
    (section) => normalizeHeading(section.heading) === "education"
  );
  const startedSection = sections.find(
    (section) => normalizeHeading(section.heading) === "when they started"
  );
  const moneyTrailSection = sections.find(
    (section) => normalizeHeading(section.heading) === "money trail"
  );
  const remainingSections = sections.filter((section) => {
    const heading = normalizeHeading(section.heading);
    return heading !== "education" && heading !== "when they started" && heading !== "money trail";
  });
  const hasOnlyNaActionPlaybook =
    actionPlaybook.length === 0 ||
    actionPlaybook.every((entry) => entry.step === "N/A" && entry.detail === "N/A");
  const hasOnlyNaReadingPrompts =
    readingPrompts.length === 0 ||
    readingPrompts.every((prompt) => prompt === "N/A");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/serve?type=billionaire&mode=new", {
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const json = (await res.json()) as ServedResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm opacity-80 hover:opacity-100">
            Home
          </Link>

          <Link
            href="/billionaires/saved"
            className="text-sm opacity-80 hover:opacity-100"
          >
            Saved
          </Link>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Next"}
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {!error && !data && (
            <div className="text-sm opacity-70">Loading profile...</div>
          )}

          {data && (
            <div>
              <div className="text-xs uppercase tracking-wider text-white/45">
                Source: {data.profile.generation_source ?? data.generation_source ?? "unknown"}
              </div>

              <h1 className="text-3xl font-bold leading-tight tracking-tight">
                {data.profile.title}
              </h1>

              <p className="mt-4 text-lg leading-relaxed opacity-90">
                {data.profile.hero_summary}
              </p>

              <div className="mt-10 space-y-8">
                {educationSection && (
                  <section>
                    <h2 className="text-xl font-bold mb-3 text-white/95">
                      {educationSection.heading}
                    </h2>
                    <p className="text-base leading-relaxed opacity-85 pl-1">
                      {educationSection.body}
                    </p>
                  </section>
                )}

                {startedSection && (
                  <section>
                    <h2 className="text-xl font-bold mb-3 text-white/95">
                      {startedSection.heading}
                    </h2>
                    <p className="text-base leading-relaxed opacity-85 pl-1">
                      {startedSection.body}
                    </p>
                  </section>
                )}

                {moneyTrailSection && (
                  <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
                    <h2 className="text-xl font-bold mb-3 text-amber-400">
                      💰 {moneyTrailSection.heading}
                    </h2>
                    <p className="text-base leading-relaxed opacity-90 pl-1">
                      {moneyTrailSection.body}
                    </p>
                  </section>
                )}

                {remainingSections.map((s, idx) => (
                  <section key={idx}>
                    <h2 className="text-xl font-bold mb-3 text-white/95">{s.heading}</h2>
                    <p className="text-base leading-relaxed opacity-85 pl-1">
                      {s.body}
                    </p>
                  </section>
                ))}
              </div>

              <div className="mt-12">
                <h2 className="text-xl font-bold mb-4 text-white/95">FAQ / Key Insights</h2>
                {hasOnlyNaActionPlaybook ? (
                  <div className="text-base opacity-80">N/A</div>
                ) : (
                  <div className="space-y-6">
                    {actionPlaybook.map((p, idx) => (
                      <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-5">
                        <div className="font-semibold text-base text-white/95 mb-3">
                          <span className="text-blue-400 mr-2">Q:</span>
                          {p.step}
                        </div>
                        <div className="text-sm leading-relaxed opacity-85 pl-6">
                          <span className="text-green-400 mr-2">A:</span>
                          {p.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-12">
                <h2 className="text-xl font-bold mb-4 text-white/95">Key Questions</h2>
                {hasOnlyNaReadingPrompts ? (
                  <div className="text-base opacity-80">N/A</div>
                ) : (
                  <ul className="space-y-3">
                    {readingPrompts.map((p, idx) => (
                      <li key={idx} className="flex gap-3 text-sm opacity-85 leading-relaxed">
                        <span className="text-white/50 flex-shrink-0">→</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-12 pt-8 border-t border-white/10">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-3">Sources</h2>
                <ul className="space-y-2 text-xs opacity-70">
                  {data.profile.sources.map((u, idx) => (
                    <li key={idx} className="truncate">
                      <a
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-white/90 transition-colors"
                      >
                        {u}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
