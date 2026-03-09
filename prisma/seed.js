const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }

  out.push(cur);
  return out;
}

function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

async function importBillionairesFromCsv() {
  const csvPath = path.join(__dirname, "..", "Billionaires_Dataset_2025.csv");
  if (!fs.existsSync(csvPath)) return;

  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return;

  const header = parseCsvLine(lines[0]);

  const CHUNK_SIZE = 100;
  let ops = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = cols[j] ?? "";
    }

    const rank = String(row.Rank ?? "").trim();
    const name = String(row.Name ?? "").trim();
    if (!rank || !name) continue;

    const netWorth = String(row.Net_Worth_Billion_USD ?? "").trim();
    const age = String(row.Age ?? "").trim();
    const country = String(row.Country ?? "").trim();
    const source = String(row.Source ?? "").trim();
    const industry = String(row.Industry ?? "").trim();

    const id = `b_${rank}_${slugify(name)}`;
    const wikipedia = `https://en.wikipedia.org/wiki/${encodeURIComponent(
      name.replace(/\s+/g, "_")
    )}`;

    const tags = [country, industry].filter(Boolean);

    const source_hints = [
      wikipedia,
      `dataset:rank=${rank}`,
      netWorth ? `dataset:net_worth_billion_usd=${netWorth}` : null,
      age ? `dataset:age=${age}` : null,
      country ? `dataset:country=${country}` : null,
      source ? `dataset:source=${source}` : null,
      industry ? `dataset:industry=${industry}` : null,
    ].filter(Boolean);

    ops.push(
      prisma.entity.upsert({
        where: { id },
        update: {
          type: "billionaire",
          name,
          source_hints: JSON.stringify(source_hints),
          tags: JSON.stringify(tags),
          status: "active",
        },
        create: {
          id,
          type: "billionaire",
          name,
          source_hints: JSON.stringify(source_hints),
          tags: JSON.stringify(tags),
          status: "active",
        },
      })
    );

    if (ops.length >= CHUNK_SIZE) {
      await prisma.$transaction(ops);
      ops = [];
    }
  }

  if (ops.length) {
    await prisma.$transaction(ops);
  }
}

async function main() {
  const entities = [
    {
      id: "c_stripe",
      type: "company",
      name: "Stripe",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Stripe,_Inc.",
        "https://stripe.com/",
      ]),
      tags: JSON.stringify(["YC", "Fintech", "Developer"]),
      status: "active",
    },
    {
      id: "c_airbnb",
      type: "company",
      name: "Airbnb",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Airbnb",
        "https://www.airbnb.com/",
      ]),
      tags: JSON.stringify(["YC", "Marketplace"]),
      status: "active",
    },
    {
      id: "c_openai",
      type: "company",
      name: "OpenAI",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/OpenAI",
        "https://openai.com/",
      ]),
      tags: JSON.stringify(["AI", "Research", "US"]),
      status: "active",
    },
    {
      id: "c_zoho",
      type: "company",
      name: "Zoho",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Zoho",
        "https://www.zoho.com/",
      ]),
      tags: JSON.stringify(["India", "SaaS"]),
      status: "active",
    },
  ];

  for (const e of entities) {
    await prisma.entity.upsert({
      where: { id: e.id },
      update: {
        type: e.type,
        name: e.name,
        source_hints: e.source_hints,
        tags: e.tags,
        status: e.status,
      },
      create: e,
    });
  }

  await importBillionairesFromCsv();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
