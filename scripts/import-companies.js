const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const path = require("path");

const prisma = new PrismaClient();

function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

async function importYCCompanies() {
  const filePath = path.join(
    __dirname,
    "..",
    "Data",
    "Companies",
    "VCs Funded companies Details",
    "ALL YC DATA_v2.xlsx"
  );

  console.log("Reading YC companies from:", filePath);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} YC companies`);

  const companies = [];
  const seen = new Set();

  for (const row of data) {
    const name = String(row["Company Name"] || row["Name"] || row["company"] || "").trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    
    seen.add(name.toLowerCase());
    
    const batch = String(row["Batch"] || row["batch"] || "").trim();
    const status = String(row["Status"] || row["status"] || "").trim();
    const industry = String(row["Industry"] || row["industry"] || row["Vertical"] || "").trim();
    const location = String(row["Location"] || row["location"] || row["Country"] || "").trim();
    const description = String(row["Description"] || row["description"] || "").trim();

    const id = `c_yc_${slugify(name)}`;
    const wikipedia = `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, "_"))}`;
    
    const tags = ["YC"];
    if (batch) tags.push(batch);
    if (industry) tags.push(industry);
    if (location) tags.push(location);
    if (status && status.toLowerCase() === "active") tags.push("Active");
    if (status && status.toLowerCase() === "acquired") tags.push("Acquired");
    if (status && status.toLowerCase() === "public") tags.push("Public");

    const source_hints = [wikipedia];
    if (description) source_hints.push(`description:${description}`);
    if (batch) source_hints.push(`batch:${batch}`);
    if (status) source_hints.push(`status:${status}`);

    companies.push({
      id,
      type: "company",
      name,
      source_hints: JSON.stringify(source_hints),
      tags: JSON.stringify(tags),
      status: "active",
    });
  }

  console.log(`Processed ${companies.length} unique YC companies`);
  return companies;
}

async function importSequoiaCompanies() {
  const filePath = path.join(
    __dirname,
    "..",
    "Data",
    "Companies",
    "VCs Funded companies Details",
    "sequoiacap.xlsx"
  );

  console.log("Reading Sequoia companies from:", filePath);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} Sequoia companies`);

  const companies = [];
  const seen = new Set();

  for (const row of data) {
    const name = String(row["Company Name"] || row["Name"] || row["company"] || "").trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    
    seen.add(name.toLowerCase());
    
    const sector = String(row["Sector"] || row["sector"] || row["Industry"] || "").trim();
    const region = String(row["Region"] || row["region"] || row["Location"] || "").trim();
    const stage = String(row["Stage"] || row["stage"] || "").trim();
    const description = String(row["Description"] || row["description"] || "").trim();

    const id = `c_seq_${slugify(name)}`;
    const wikipedia = `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, "_"))}`;
    
    const tags = ["Sequoia"];
    if (sector) tags.push(sector);
    if (region) tags.push(region);
    if (stage) tags.push(stage);

    const source_hints = [wikipedia];
    if (description) source_hints.push(`description:${description}`);
    if (sector) source_hints.push(`sector:${sector}`);
    if (region) source_hints.push(`region:${region}`);

    companies.push({
      id,
      type: "company",
      name,
      source_hints: JSON.stringify(source_hints),
      tags: JSON.stringify(tags),
      status: "active",
    });
  }

  console.log(`Processed ${companies.length} unique Sequoia companies`);
  return companies;
}

async function main() {
  try {
    const ycCompanies = await importYCCompanies();
    const sequoiaCompanies = await importSequoiaCompanies();
    
    const allCompanies = [...ycCompanies, ...sequoiaCompanies];
    console.log(`\nTotal companies to import: ${allCompanies.length}`);

    const BATCH_SIZE = 100;
    let imported = 0;

    for (let i = 0; i < allCompanies.length; i += BATCH_SIZE) {
      const batch = allCompanies.slice(i, i + BATCH_SIZE);
      const ops = batch.map((company) =>
        prisma.entity.upsert({
          where: { id: company.id },
          update: {
            type: company.type,
            name: company.name,
            source_hints: company.source_hints,
            tags: company.tags,
            status: company.status,
          },
          create: company,
        })
      );

      await prisma.$transaction(ops);
      imported += batch.length;
      console.log(`Imported ${imported}/${allCompanies.length} companies...`);
    }

    console.log("\n✅ Successfully imported all companies!");
    
    const stats = await prisma.entity.groupBy({
      by: ['type'],
      _count: true,
      where: { type: 'company' }
    });
    
    console.log("\nDatabase stats:");
    console.log(`Total companies: ${stats[0]?._count || 0}`);
    
  } catch (error) {
    console.error("Error importing companies:", error);
    throw error;
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
