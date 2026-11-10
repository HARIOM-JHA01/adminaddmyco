import mongoose from "mongoose";
import dotenv from "dotenv";
import CompanyModel from "./Models/Company.js";
import ChamberModel from "./Models/Chamber.js";

dotenv.config();

/**
 * Migration: moves legacy Company/Chamber social fields into `socialLinks`.
 *  - Telegram (company.telegramId / chamber.tgchannel) is Channel 1 -> kept in place (frontend treats it as Channel 1)
 *  - Linkedin / website / chamberwebsite stay as the fixed links
 *  - Facebook, Instagram, Youtube, Twitter -> socialLinks (in that order)
 * Legacy fields are NOT removed, so older app versions keep working.
 * Docs that already have `socialLinks` are skipped (safe to re-run).
 * Usage: node migrate-social-links.js [--dry]
 */
const DATABASE_URL = process.env.DB || "mongodb://127.0.0.1:27017";
const DRY = process.argv.includes("--dry");
const LEGACY = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["youtube", "Youtube"],
  ["twitter", "Twitter"],
];

async function run(Model, label) {
  const docs = await Model.find({ socialLinks: { $exists: false } });
  let changed = 0;
  for (const d of docs) {
    const links = [];
    for (const [type, field] of LEGACY) {
      const url = (d[field] || "").trim();
      if (url) links.push({ type, url });
    }
    changed++;
    if (!DRY) {
      await Model.updateOne({ _id: d._id }, { $set: { socialLinks: links } });
    }
  }
  console.log(`${label}: ${DRY ? "would update" : "updated"} ${changed} of ${docs.length} docs`);
}

async function migrate() {
  await mongoose.connect(DATABASE_URL);
  await run(CompanyModel, "Company");
  await run(ChamberModel, "Chamber");
  await mongoose.disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
