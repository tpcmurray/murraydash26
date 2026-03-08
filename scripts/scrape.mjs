/**
 * MurrayDash Science Facts Scraper
 *
 * Scrapes all facts from sciensational.com across 5 categories,
 * downloads images, and outputs:
 *   - data/science-facts.json  (seed data)
 *   - data/images/             (downloaded images)
 *
 * Run: node scrape.mjs
 *
 * Prerequisites: npm install cheerio
 *
 * DOM structure (verified from source):
 *   #content
 *     div.factsp
 *       span.para
 *         img.lazy[src="/common/x/i/img/facts/mercury.jpg"]
 *         " Mercury is the "
 *         b "fastest planet"
 *         " in the Solar System..."
 *         span.sciensational  (watermark — remove)
 *         span.sender         (attribution — remove)
 *         span.bracketed      (parenthetical — keep)
 */

import { load } from "cheerio";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, extname } from "path";
import { randomUUID } from "crypto";

const BASE_URL = "https://www.sciensational.com";
const OUTPUT_DIR = "./data";
const IMAGE_DIR = join(OUTPUT_DIR, "images");

const CATEGORIES = [
  { name: "astronomy", startPage: "/astronomy.html" },
  { name: "mathematics", startPage: "/maths.html" },
  { name: "physics", startPage: "/physics.html" },
  { name: "chemistry", startPage: "/chemistry.html" },
  { name: "biology", startPage: "/biology.html" },
];

const DELAY_MS = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(url) {
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "MurrayDash-Scraper/1.0 (personal project)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function downloadImage(imageUrl, category, index) {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "MurrayDash-Scraper/1.0 (personal project)" },
    });
    if (!res.ok) {
      console.warn(`    ⚠ Failed to download image: ${imageUrl} (${res.status})`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    let ext = ".jpg";
    if (contentType.includes("png")) ext = ".png";
    else if (contentType.includes("gif")) ext = ".gif";
    else if (contentType.includes("webp")) ext = ".webp";
    else {
      const urlExt = extname(new URL(imageUrl).pathname).toLowerCase();
      if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(urlExt)) {
        ext = urlExt;
      }
    }

    const filename = `${category}-${String(index).padStart(3, "0")}${ext}`;
    const buffer = Buffer.from(await res.arrayBuffer());
    const filepath = join(IMAGE_DIR, filename);
    writeFileSync(filepath, buffer);
    console.log(`    ✓ Image: ${filename} (${(buffer.length / 1024).toFixed(1)}KB)`);
    return filename;
  } catch (err) {
    console.warn(`    ⚠ Image download error: ${err.message}`);
    return null;
  }
}

function cleanFactText($, paraEl) {
  const $clone = $(paraEl).clone();

  // Remove elements we don't want in the fact text
  $clone.find("img").remove();
  $clone.find("span.sciensational").remove();
  $clone.find("span.sender").remove();

  // Keep span.bracketed and <b> — they're part of the fact
  return $clone.text().replace(/\s+/g, " ").trim();
}

async function scrapeCategoryPage(url) {
  const html = await fetchPage(url);
  const $ = load(html);
  const facts = [];

  // Each fact: #content div.factsp > span.para
  $("#content div.factsp").each((i, el) => {
    const $para = $(el).find("span.para").first();
    if ($para.length === 0) return;

    // Extract image URL from img.lazy
    const $img = $para.find("img.lazy").first();
    // Fall back to any img if .lazy class isn't present on some pages
    const $imgFallback = $img.length ? $img : $para.find("img").first();

    let imgSrc = $imgFallback.attr("src") || $imgFallback.attr("data-src") || "";

    // Make absolute URL
    if (imgSrc && !imgSrc.startsWith("http")) {
      imgSrc = `${BASE_URL}${imgSrc.startsWith("/") ? "" : "/"}${imgSrc}`;
    }

    const altText = $imgFallback.attr("alt") || "";

    // Extract clean fact text
    const factText = cleanFactText($, $para);

    if (factText.length > 10) {
      facts.push({
        imageUrl: imgSrc || null,
        altText,
        factText,
      });
    }
  });

  // Find "Next" pagination link
  let nextPage = null;
  $("a").each((i, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href");
    if ((text.includes("Next") || text.includes("▶")) && href && href !== "#") {
      nextPage = href.startsWith("http")
        ? href
        : `${BASE_URL}/${href.replace(/^\//, "")}`;
    }
  });

  return { facts, nextPage };
}

async function scrapeCategory(category) {
  console.log(`\n📂 Scraping category: ${category.name}`);

  const allFacts = [];
  let currentPage = `${BASE_URL}${category.startPage}`;
  let pageNum = 1;
  let globalIndex = 0;

  while (currentPage) {
    console.log(`  Page ${pageNum}:`);
    await sleep(DELAY_MS);

    try {
      const { facts, nextPage } = await scrapeCategoryPage(currentPage);

      if (facts.length === 0) {
        console.log("    ⚠ No facts found on this page — stopping pagination.");
        break;
      }

      for (const fact of facts) {
        globalIndex++;

        let imageFilename = null;
        if (fact.imageUrl) {
          await sleep(300);
          imageFilename = await downloadImage(
            fact.imageUrl,
            category.name,
            globalIndex
          );
        }

        allFacts.push({
          id: randomUUID(),
          category: category.name,
          factText: fact.factText,
          imageFilename,
          imageUrl: fact.imageUrl,
          sourceUrl: currentPage,
        });
      }

      console.log(
        `    ✓ ${facts.length} facts extracted (${allFacts.length} total for category)`
      );
      currentPage = nextPage;
      pageNum++;
    } catch (err) {
      console.error(`    ✗ Error on page ${pageNum}: ${err.message}`);
      break;
    }
  }

  return allFacts;
}

async function main() {
  console.log("🔬 MurrayDash Science Facts Scraper");
  console.log("===================================\n");

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!existsSync(IMAGE_DIR)) mkdirSync(IMAGE_DIR, { recursive: true });

  const allFacts = [];

  for (const category of CATEGORIES) {
    const facts = await scrapeCategory(category);
    allFacts.push(...facts);
  }

  // Write the JSON seed file
  const outputPath = join(OUTPUT_DIR, "science-facts.json");
  writeFileSync(outputPath, JSON.stringify(allFacts, null, 2));

  console.log("\n===================================");
  console.log(`✅ Done! Scraped ${allFacts.length} total facts.`);
  console.log(`   JSON: ${outputPath}`);
  console.log(`   Images: ${IMAGE_DIR}/`);
  console.log("\nBreakdown by category:");
  for (const cat of CATEGORIES) {
    const count = allFacts.filter((f) => f.category === cat.name).length;
    console.log(`   ${cat.name}: ${count} facts`);
  }

  const noImage = allFacts.filter((f) => !f.imageFilename).length;
  if (noImage > 0) {
    console.log(
      `\n⚠ ${noImage} facts have no image. You may want to find replacements.`
    );
  }

  console.log("\n📋 Next steps:");
  console.log("   1. Review data/science-facts.json for quality");
  console.log("   2. Copy data/ folder into your MurrayDash project");
  console.log(
    "   3. Run the Drizzle seed script: npx tsx scripts/seed-science-facts.ts"
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
