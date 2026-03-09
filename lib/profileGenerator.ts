export type GeneratedProfilePayload = {
  title: string;
  hero_summary: string;
  sections: Array<{ heading: string; body: string }>;
  action_playbook: Array<{ step: string; detail: string }>;
  reading_prompts: string[];
  sources: string[];
};

export type ProfileGeneratorInput = {
  type: "billionaire" | "company";
  name: string;
  tags: string[];
  sourceHints: string[];
  csvFields?: Record<string, string>;
};

 const NA_VALUE = "N/A";
 const REQUIRED_SECTION_HEADINGS = [
   "Key Facts",
   "Education",
   "When They Started",
   "Money Trail",
   "Value Creation",
   "Core Advantage",
   "Key Decisions",
   "What to Learn",
 ] as const;

 function normalizeHeading(heading: string): string {
   return heading.trim().toLowerCase();
 }

 function isPlaceholderText(value: string): boolean {
   const body = value.trim();
   if (!body) {
     return true;
   }

   if (body === NA_VALUE) {
     return false;
   }

   return /pending|will be documented|will be analyzed|analysis pending|profile pending full analysis|requires additional data sources|this section will|replicable patterns and first-principles insights will be extracted|critical inflection points and strategic decisions will be documented|identify the value creation source|analyze the unfair advantage|study the scaling mechanism|extract decision patterns|map to your context|specific mechanisms of value creation|require deeper research|what was the first product or asset|how did .* acquire the initial capital|what specific advantage .* defensible|what were the 2-3 most critical decisions|what pattern from .* playbook would be most replicable|who were the first customers|what distribution channel enabled initial growth|what was the core competitive advantage|what would be the modern equivalent strategy/i.test(
     body
   );
 }

function isLowSignalSection(section: { heading: string; body: string }): boolean {
  const heading = normalizeHeading(section.heading);
  const body = section.body.trim();

  if (!body) {
    return true;
  }

  if (body === NA_VALUE) {
    return false;
  }

  if (heading === "value creation") {
    const hasStartPoint = /first profitable|first venture|founded|co-founded|launched|started|invested in/i.test(body);
    const hasMoneyTrail = /sold|sale|stake|equity|ownership|holding|dividend|reinvest|acquired|acquisition|merged|ipo|listed|public|valuation|appreciat|compounded|exit|cash flow/i.test(body);

    if (hasStartPoint && !hasMoneyTrail) {
      return true;
    }
  }

  return isPlaceholderText(body) || (body.length < 20 && heading !== "key facts");
}

function normalizeSections(
  sections: Array<{ heading: string; body: string }>
): Array<{ heading: string; body: string }> {
  const normalized = sections
    .map((section) => ({
      heading: section.heading,
      body: typeof section.body === "string" ? section.body.trim() : NA_VALUE,
    }))
    .map((section) => ({
      heading: section.heading,
      body: isLowSignalSection(section) ? NA_VALUE : section.body,
    }));

  const byHeading = new Map(normalized.map((section) => [normalizeHeading(section.heading), section]));
  const requiredSections = REQUIRED_SECTION_HEADINGS.map((heading) => {
    const existing = byHeading.get(normalizeHeading(heading));
    return existing ?? { heading, body: NA_VALUE };
  });

  const extraSections = normalized.filter(
    (section) => !REQUIRED_SECTION_HEADINGS.some((heading) => normalizeHeading(heading) === normalizeHeading(section.heading))
  );

  return [...requiredSections, ...extraSections];
}

function buildSources(input: ProfileGeneratorInput): string[] {
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(input.name)}`;
  const forbesSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${input.name} forbes`)}`;
  const fallbackSources =
    input.type === "billionaire"
      ? [
          `https://en.wikipedia.org/wiki/${encodeURIComponent(input.name.replace(/ /g, "_"))}`,
          `https://www.forbes.com/profile/${encodeURIComponent(input.name.toLowerCase().replace(/ /g, "-"))}/`,
        ]
      : [
          `https://en.wikipedia.org/wiki/${encodeURIComponent(input.name.replace(/ /g, "_"))}`,
          `https://www.crunchbase.com/organization/${encodeURIComponent(input.name.toLowerCase().replace(/ /g, "-"))}`,
        ];

  return Array.from(
    new Set([
      ...(input.sourceHints.length ? input.sourceHints : fallbackSources),
      googleSearchUrl,
      forbesSearchUrl,
    ])
  );
}

export function normalizeGeneratedProfile(
  payload: GeneratedProfilePayload,
  input: ProfileGeneratorInput
): GeneratedProfilePayload {
  const normalizedActionPlaybook = payload.action_playbook.length
    ? payload.action_playbook.map((entry) => ({
        step: !entry.step || isPlaceholderText(entry.step) ? NA_VALUE : entry.step.trim(),
        detail: !entry.detail || isPlaceholderText(entry.detail) ? NA_VALUE : entry.detail.trim(),
      }))
    : [{ step: NA_VALUE, detail: NA_VALUE }];

  const normalizedReadingPrompts = payload.reading_prompts.length
    ? payload.reading_prompts.map((prompt) => {
        const value = String(prompt).trim();
        return !value || isPlaceholderText(value) ? NA_VALUE : value;
      })
    : [NA_VALUE];

  return {
    title:
      !payload.title || isPlaceholderText(payload.title) ? input.name : payload.title.trim(),
    hero_summary:
      !payload.hero_summary || isPlaceholderText(payload.hero_summary)
        ? NA_VALUE
        : payload.hero_summary.trim(),
    sections: normalizeSections(payload.sections),
    action_playbook: normalizedActionPlaybook,
    reading_prompts: normalizedReadingPrompts,
    sources: buildSources(input),
  };
}

export function generateProfile(input: ProfileGeneratorInput): GeneratedProfilePayload {
  const isBillionaire = input.type === "billionaire";
  const hasData = isBillionaire && input.csvFields;
  const csvFields = input.csvFields;

  const title = hasData && csvFields
    ? `${input.name}: ${csvFields.source || "Wealth Builder"}`
    : input.name;

  const hero_summary = hasData && csvFields
    ? `${input.name} has built a net worth of $${csvFields.net_worth_billion_usd}B (ranked #${csvFields.rank} globally) primarily through ${csvFields.source}. Based in ${csvFields.country}, ${csvFields.age ? `age ${csvFields.age}, ` : ""}operating in the ${csvFields.industry} sector.`
    : NA_VALUE;

  const keyFactsBody = hasData && csvFields
    ? [
        `Net worth: $${csvFields.net_worth_billion_usd}B (rank #${csvFields.rank} globally)`,
        `Age: ${csvFields.age || "N/A"}`,
        `Country: ${csvFields.country}`,
        `Primary wealth source: ${csvFields.source}`,
        `Industry: ${csvFields.industry}`,
      ].join(" • ")
    : NA_VALUE;

  const sections = [
    {
      heading: "Key Facts",
      body: keyFactsBody,
    },
    {
      heading: "Education",
      body: NA_VALUE,
    },
    {
      heading: "When They Started",
      body: NA_VALUE,
    },
    {
      heading: "Money Trail",
      body: NA_VALUE,
    },
    {
      heading: "Value Creation",
      body: NA_VALUE,
    },
    {
      heading: "Core Advantage",
      body: NA_VALUE,
    },
    {
      heading: "Key Decisions",
      body: NA_VALUE,
    },
    {
      heading: "What to Learn",
      body: NA_VALUE,
    },
  ];

  const action_playbook = [
    {
      step: NA_VALUE,
      detail: NA_VALUE,
    },
  ];

  const reading_prompts = [NA_VALUE];

  return normalizeGeneratedProfile({
    title,
    hero_summary,
    sections,
    action_playbook,
    reading_prompts,
    sources: buildSources(input),
  }, input);
}
