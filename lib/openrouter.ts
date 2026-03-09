import type { GeneratedProfilePayload } from "@/lib/profileGenerator";

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);

  return trimmed;
}

function isValidPayload(x: unknown): x is GeneratedProfilePayload {
  if (!x || typeof x !== "object") return false;
  const o = x as any;
  if (typeof o.title !== "string") return false;
  if (typeof o.hero_summary !== "string") return false;
  if (!Array.isArray(o.sections)) return false;
  if (!Array.isArray(o.action_playbook)) return false;
  if (!Array.isArray(o.reading_prompts)) return false;
  if (!Array.isArray(o.sources)) return false;
  return true;
}

export async function generateWithOpenRouter(input: {
  masterPrompt: string;
  model: string;
  type: "billionaire" | "company";
  name: string;
  tags: string[];
  sourceHints: string[];
  csvFields?: Record<string, string>;
}): Promise<{ payload: GeneratedProfilePayload; raw: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not set");
  }

  const body = {
    model: input.model,
    temperature: 0.7,
    messages: [
      { role: "system", content: input.masterPrompt },
      {
        role: "user",
        content: JSON.stringify(
          {
            entity: {
              type: input.type,
              name: input.name,
              tags: input.tags,
              source_hints: input.sourceHints,
              csv_fields: input.csvFields,
            },
            instruction:
              "Return ONLY valid JSON matching the schema. No markdown. No extra keys.",
          },
          null,
          2
        ),
      },
    ],
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(process.env.OPENROUTER_HTTP_REFERER
        ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
        : {}),
      ...(process.env.OPENROUTER_APP_TITLE
        ? { "X-Title": process.env.OPENROUTER_APP_TITLE }
        : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter error (${res.status}): ${text}`);
  }

  const json = (await res.json()) as any;
  const content =
    json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? "";

  const raw = String(content);
  const extracted = extractJsonObject(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch {
    throw new Error("OpenRouter returned non-JSON content");
  }

  if (!isValidPayload(parsed)) {
    throw new Error("OpenRouter JSON did not match required schema");
  }

  return { payload: parsed, raw };
}
