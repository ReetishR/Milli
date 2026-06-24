import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeGeneratedProfile } from "@/lib/profileGenerator";

export default async function SavedCompanyProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await prisma.generatedProfile.findUnique({
    where: { id: params.id },
    include: { entity: true },
  });

  if (!profile || profile.type !== "company") {
    notFound();
  }

  const parseJsonArray = (input: string): string[] => {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };

  const normalizedProfile = normalizeGeneratedProfile(
    {
      title: profile.title,
      hero_summary: profile.hero_summary,
      sections: JSON.parse(profile.sections_json) as Array<{ heading: string; body: string }>,
      action_playbook: JSON.parse(profile.action_playbook) as Array<{ step: string; detail: string }>,
      reading_prompts: JSON.parse(profile.reading_prompts) as string[],
      sources: JSON.parse(profile.sources) as string[],
    },
    {
      type: "company",
      name: profile.entity.name,
      tags: parseJsonArray(profile.entity.tags),
      sourceHints: parseJsonArray(profile.entity.source_hints),
      csvFields: {},
    }
  );

  const sections = normalizedProfile.sections;
  const action_playbook = normalizedProfile.action_playbook;
  const reading_prompts = normalizedProfile.reading_prompts;
  const sources = normalizedProfile.sources;
  const normalizeHeading = (heading: string) => heading.trim().toLowerCase();
  const moneyTrailSection = sections.find(
    (section) => normalizeHeading(section.heading) === "money trail"
  );
  const remainingSections = sections.filter(
    (section) => normalizeHeading(section.heading) !== "money trail"
  );
  const hasOnlyNaActionPlaybook =
    action_playbook.length === 0 ||
    action_playbook.every((entry) => entry.step === "N/A" && entry.detail === "N/A");
  const hasOnlyNaReadingPrompts =
    reading_prompts.length === 0 ||
    reading_prompts.every((prompt) => prompt === "N/A");

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/companies/saved" className="text-sm opacity-80 hover:opacity-100">
            Back
          </Link>
          <Link href="/" className="text-sm opacity-80 hover:opacity-100">
            Home
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs opacity-60">
            Saved version {profile.version} | Generated at {new Date(profile.generated_at).toLocaleString()}
          </div>

          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">{profile.title}</h1>
          <p className="mt-4 text-base leading-relaxed opacity-85">{profile.hero_summary}</p>

          <div className="mt-8 space-y-6">
            {moneyTrailSection && (
              <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
                <h2 className="text-lg font-semibold tracking-tight text-amber-400">💰 {moneyTrailSection.heading}</h2>
                <p className="mt-3 text-sm leading-relaxed opacity-90">{moneyTrailSection.body}</p>
              </section>
            )}

            {remainingSections.map((s, idx) => (
              <section key={idx} className="rounded-xl border border-white/10 bg-black/30 p-5">
                <h2 className="text-lg font-semibold tracking-tight">{s.heading}</h2>
                <p className="mt-3 text-sm leading-relaxed opacity-80">{s.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">FAQ / Key Insights</h2>
            {hasOnlyNaActionPlaybook ? (
              <div className="mt-4 text-sm opacity-80">N/A</div>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                {action_playbook.map((p, idx) => (
                  <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="font-medium text-white/90 mb-2">
                      <span className="text-blue-400 mr-2">Q:</span>
                      {p.step}
                    </div>
                    <div className="leading-relaxed opacity-85 pl-5">
                      <span className="text-green-400 mr-2">A:</span>
                      {p.detail}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">Reading prompts</h2>
            {hasOnlyNaReadingPrompts ? (
              <div className="mt-4 text-sm opacity-80">N/A</div>
            ) : (
              <ul className="mt-4 grid gap-3 text-sm opacity-80 sm:grid-cols-2">
                {reading_prompts.map((p, idx) => (
                  <li key={idx} className="rounded-lg border border-white/10 bg-black/30 p-4 leading-relaxed">
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">Sources</h2>
            <ul className="mt-4 space-y-2 text-sm opacity-80">
              {sources.map((u, idx) => (
                <li key={idx} className="truncate">
                  <a
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4 opacity-80 hover:opacity-100"
                  >
                    {u}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
