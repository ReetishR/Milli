import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateProfile, normalizeGeneratedProfile } from "@/lib/profileGenerator";
import type { ProfileGeneratorInput } from "@/lib/profileGenerator";
import { getMasterPrompt } from "@/lib/masterPrompt";
import { generateWithOpenRouter } from "@/lib/openrouter";

function parseJsonArray(input: string): string[] {
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as "billionaire" | "company" | null;
  const tag = url.searchParams.get("tag");
  const mode = url.searchParams.get("mode") ?? "new"; // 'new' or 'reuse'

  if (!type || (type !== "billionaire" && type !== "company")) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const where: {
    type: string;
    status: string;
    tags?: { contains: string };
  } = {
    type,
    status: "active",
  };

  if (tag) {
    where.tags = { contains: `\"${tag}\"` };
  }

  const candidates = await prisma.entity.findMany({
    where,
    orderBy: [{ last_served_at: "asc" }, { id: "asc" }],
    take: 100,
  });

  if (!candidates.length) {
    return NextResponse.json({ error: "No entities available" }, { status: 404 });
  }

  // Randomly pick from the 25 least-recently-served to avoid immediate repeats
  const leastRecent = candidates.slice(0, Math.min(25, candidates.length));
  const entity = leastRecent[Math.floor(Math.random() * leastRecent.length)];
  const tags = parseJsonArray(entity.tags);
  const sourceHints = parseJsonArray(entity.source_hints);

  const generationSourceHints = (() => {
    const hints = [...sourceHints];
    if (type === "billionaire") {
      const linkedinSearch = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
        entity.name
      )}`;
      if (!hints.includes(linkedinSearch)) {
        hints.unshift(linkedinSearch);
      }
    }
    return hints;
  })();

  const csvFields: Record<string, string> = {};

  const generationInput: ProfileGeneratorInput = {
    type,
    name: entity.name,
    tags,
    sourceHints: generationSourceHints,
    csvFields,
  };

  if (type === "billionaire") {
    for (const hint of sourceHints) {
      const m = hint.match(/^dataset:(\w+)=(.+)$/);
      if (m) {
        csvFields[m[1]] = m[2];
      }
    }
  }

  const latest = await prisma.generatedProfile.findFirst({
    where: { entity_id: entity.id },
    orderBy: { version: "desc" },
  });

  if (mode === "reuse" && latest) {
    await prisma.entity.update({
      where: { id: entity.id },
      data: {
        last_served_at: new Date(),
        times_served: { increment: 1 },
      },
    });

    const normalizedLatest = normalizeGeneratedProfile(
      {
        title: latest.title,
        hero_summary: latest.hero_summary,
        sections: JSON.parse(latest.sections_json),
        action_playbook: JSON.parse(latest.action_playbook),
        reading_prompts: JSON.parse(latest.reading_prompts),
        sources: JSON.parse(latest.sources),
      },
      generationInput
    );

    return NextResponse.json({
      entity: {
        id: entity.id,
        type: entity.type,
        name: entity.name,
        tags,
        source_hints: sourceHints,
      },
      profile: {
        id: latest.id,
        title: normalizedLatest.title,
        hero_summary: normalizedLatest.hero_summary,
        sections: normalizedLatest.sections,
        action_playbook: normalizedLatest.action_playbook,
        reading_prompts: normalizedLatest.reading_prompts,
        sources: normalizedLatest.sources,
        version: latest.version,
        generated_at: latest.generated_at,
      },
      served_at: new Date().toISOString(),
    });
  }

  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o";
  const { prompt: masterPrompt } = getMasterPrompt();
  let generationSource: "openrouter" | "fallback" = "fallback";
  let generationError: string | null = null;

  const generated = await (async () => {
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const { payload } = await generateWithOpenRouter({
          masterPrompt,
          model,
          type,
          name: entity.name,
          tags,
          sourceHints: generationSourceHints,
          csvFields: generationInput.csvFields,
        });
        generationSource = "openrouter";
        return normalizeGeneratedProfile(payload, generationInput);
      } catch (error) {
        generationError = error instanceof Error ? error.message : "Unknown OpenRouter error";
        return null;
      }
    }

    return generateProfile(generationInput);
  })();

  if (!generated) {
    return NextResponse.json(
      {
        error: generationError ?? "OpenRouter generation failed",
        generation_source: "openrouter_error",
      },
      { status: 502 }
    );
  }

  const nextVersion = (latest?.version ?? 0) + 1;

  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const gp = await tx.generatedProfile.create({
      data: {
        entity_id: entity.id,
        type,
        title: generated.title,
        hero_summary: generated.hero_summary,
        sections_json: JSON.stringify(generated.sections),
        action_playbook: JSON.stringify(generated.action_playbook),
        reading_prompts: JSON.stringify(generated.reading_prompts),
        sources: JSON.stringify(generated.sources),
        version: nextVersion,
      },
    });

    await tx.entity.update({
      where: { id: entity.id },
      data: {
        last_served_at: new Date(),
        times_served: { increment: 1 },
      },
    });

    return gp;
  });

  return NextResponse.json({
    entity: {
      id: entity.id,
      type: entity.type,
      name: entity.name,
      tags,
      source_hints: sourceHints,
    },
    profile: {
      id: created.id,
      title: created.title,
      hero_summary: created.hero_summary,
      sections: JSON.parse(created.sections_json),
      action_playbook: JSON.parse(created.action_playbook),
      reading_prompts: JSON.parse(created.reading_prompts),
      sources: JSON.parse(created.sources),
      version: created.version,
      generated_at: created.generated_at,
      generation_source: generationSource,
    },
    generation_source: generationSource,
    served_at: new Date().toISOString(),
  });
}
