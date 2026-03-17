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
    // YC Companies
    {
      id: "c_stripe",
      type: "company",
      name: "Stripe",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Stripe,_Inc.",
        "https://stripe.com/",
      ]),
      tags: JSON.stringify(["YC", "Fintech", "Developer", "US"]),
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
      tags: JSON.stringify(["YC", "Marketplace", "US"]),
      status: "active",
    },
    {
      id: "c_dropbox",
      type: "company",
      name: "Dropbox",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Dropbox",
        "https://www.dropbox.com/",
      ]),
      tags: JSON.stringify(["YC", "SaaS", "Storage", "US"]),
      status: "active",
    },
    {
      id: "c_reddit",
      type: "company",
      name: "Reddit",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Reddit",
        "https://www.reddit.com/",
      ]),
      tags: JSON.stringify(["YC", "Social", "US"]),
      status: "active",
    },
    {
      id: "c_coinbase",
      type: "company",
      name: "Coinbase",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Coinbase",
        "https://www.coinbase.com/",
      ]),
      tags: JSON.stringify(["YC", "Fintech", "Crypto", "US"]),
      status: "active",
    },
    {
      id: "c_instacart",
      type: "company",
      name: "Instacart",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Instacart",
        "https://www.instacart.com/",
      ]),
      tags: JSON.stringify(["YC", "Marketplace", "Delivery", "US"]),
      status: "active",
    },
    {
      id: "c_doordash",
      type: "company",
      name: "DoorDash",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/DoorDash",
        "https://www.doordash.com/",
      ]),
      tags: JSON.stringify(["YC", "Marketplace", "Delivery", "US"]),
      status: "active",
    },
    {
      id: "c_twitch",
      type: "company",
      name: "Twitch",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Twitch_(service)",
        "https://www.twitch.tv/",
      ]),
      tags: JSON.stringify(["YC", "Media", "Gaming", "US"]),
      status: "active",
    },
    // AI Companies
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
      id: "c_anthropic",
      type: "company",
      name: "Anthropic",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Anthropic",
        "https://www.anthropic.com/",
      ]),
      tags: JSON.stringify(["AI", "Research", "US"]),
      status: "active",
    },
    {
      id: "c_deepmind",
      type: "company",
      name: "DeepMind",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/DeepMind",
        "https://www.deepmind.com/",
      ]),
      tags: JSON.stringify(["AI", "Research", "UK"]),
      status: "active",
    },
    {
      id: "c_midjourney",
      type: "company",
      name: "Midjourney",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Midjourney",
        "https://www.midjourney.com/",
      ]),
      tags: JSON.stringify(["AI", "Creative", "US"]),
      status: "active",
    },
    {
      id: "c_stability_ai",
      type: "company",
      name: "Stability AI",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Stability_AI",
        "https://stability.ai/",
      ]),
      tags: JSON.stringify(["AI", "Creative", "UK"]),
      status: "active",
    },
    // India Companies
    {
      id: "c_zoho",
      type: "company",
      name: "Zoho",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Zoho",
        "https://www.zoho.com/",
      ]),
      tags: JSON.stringify(["India", "SaaS", "Bootstrapped"]),
      status: "active",
    },
    {
      id: "c_freshworks",
      type: "company",
      name: "Freshworks",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Freshworks",
        "https://www.freshworks.com/",
      ]),
      tags: JSON.stringify(["India", "SaaS", "US"]),
      status: "active",
    },
    {
      id: "c_razorpay",
      type: "company",
      name: "Razorpay",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Razorpay",
        "https://razorpay.com/",
      ]),
      tags: JSON.stringify(["India", "Fintech", "YC"]),
      status: "active",
    },
    {
      id: "c_zerodha",
      type: "company",
      name: "Zerodha",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Zerodha",
        "https://zerodha.com/",
      ]),
      tags: JSON.stringify(["India", "Fintech", "Bootstrapped"]),
      status: "active",
    },
    {
      id: "c_cred",
      type: "company",
      name: "CRED",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/CRED_(company)",
        "https://cred.club/",
      ]),
      tags: JSON.stringify(["India", "Fintech"]),
      status: "active",
    },
    {
      id: "c_swiggy",
      type: "company",
      name: "Swiggy",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Swiggy",
        "https://www.swiggy.com/",
      ]),
      tags: JSON.stringify(["India", "Delivery", "Marketplace"]),
      status: "active",
    },
    {
      id: "c_flipkart",
      type: "company",
      name: "Flipkart",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Flipkart",
        "https://www.flipkart.com/",
      ]),
      tags: JSON.stringify(["India", "Ecommerce", "Marketplace"]),
      status: "active",
    },
    // Other Notable Companies
    {
      id: "c_notion",
      type: "company",
      name: "Notion",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Notion_(productivity_software)",
        "https://www.notion.so/",
      ]),
      tags: JSON.stringify(["SaaS", "Productivity", "US"]),
      status: "active",
    },
    {
      id: "c_figma",
      type: "company",
      name: "Figma",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Figma",
        "https://www.figma.com/",
      ]),
      tags: JSON.stringify(["SaaS", "Design", "US"]),
      status: "active",
    },
    {
      id: "c_canva",
      type: "company",
      name: "Canva",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Canva",
        "https://www.canva.com/",
      ]),
      tags: JSON.stringify(["SaaS", "Design", "Australia"]),
      status: "active",
    },
    {
      id: "c_shopify",
      type: "company",
      name: "Shopify",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Shopify",
        "https://www.shopify.com/",
      ]),
      tags: JSON.stringify(["SaaS", "Ecommerce", "Canada"]),
      status: "active",
    },
    {
      id: "c_spotify",
      type: "company",
      name: "Spotify",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Spotify",
        "https://www.spotify.com/",
      ]),
      tags: JSON.stringify(["Media", "Music", "Sweden"]),
      status: "active",
    },
    {
      id: "c_netflix",
      type: "company",
      name: "Netflix",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Netflix",
        "https://www.netflix.com/",
      ]),
      tags: JSON.stringify(["Media", "Streaming", "US"]),
      status: "active",
    },
    {
      id: "c_uber",
      type: "company",
      name: "Uber",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Uber",
        "https://www.uber.com/",
      ]),
      tags: JSON.stringify(["Marketplace", "Delivery", "US"]),
      status: "active",
    },
    {
      id: "c_slack",
      type: "company",
      name: "Slack",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Slack_(software)",
        "https://slack.com/",
      ]),
      tags: JSON.stringify(["SaaS", "Productivity", "US"]),
      status: "active",
    },
    {
      id: "c_atlassian",
      type: "company",
      name: "Atlassian",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/Atlassian",
        "https://www.atlassian.com/",
      ]),
      tags: JSON.stringify(["SaaS", "Developer", "Australia"]),
      status: "active",
    },
    {
      id: "c_github",
      type: "company",
      name: "GitHub",
      source_hints: JSON.stringify([
        "https://en.wikipedia.org/wiki/GitHub",
        "https://github.com/",
      ]),
      tags: JSON.stringify(["Developer", "SaaS", "US"]),
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
