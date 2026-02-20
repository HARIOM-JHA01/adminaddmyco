import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import moment from "moment";

import UserModel from "../Models/User.js";
import EmployeeNamecardModel from "../Models/EmployeeNamecard.js";
import EnterpriseAuditModel from "../Models/EnterpriseAudit.js";

dotenv.config();

const DATABASE_URL = process.env.DB || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DBNAME || "addmyco";

function normalizeTelegramUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

function generateUsername() {
  return crypto.randomBytes(4).toString("hex");
}

async function generateUniqueFreeUsername() {
  let freeUsername = generateUsername();
  while (true) {
    const conflict = await UserModel.findOne({ freeUsername });
    if (!conflict) return freeUsername;
    freeUsername = generateUsername();
  }
}

async function buildActiveUsername(tgid) {
  const base = normalizeTelegramUsername(tgid);
  if (!base) return null;
  const conflict = await UserModel.findOne({ username: base });
  if (!conflict) return base;
  return `${base}-${crypto.randomBytes(2).toString("hex")}`;
}

async function generateEnterpriseMemberId() {
  const count = await UserModel.countDocuments();
  return "ENTERPRISE-" + (count + 1).toString().padStart(8, "0");
}

async function findUserByTelegramUsername(telegramUsername) {
  const normalized = normalizeTelegramUsername(telegramUsername);
  if (!normalized) return null;
  const esc = normalized.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
  const re = new RegExp(`^${esc}$`, "i");
  const reAt = new RegExp(`^@${esc}$`, "i");
  return UserModel.findOne({ $or: [{ tgid: re }, { tgid: reAt }] });
}

async function main() {
  console.log("Starting employee user backfill from namecards...");
  await mongoose.connect(DATABASE_URL, {
    dbName: DB_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log(`Connected to DB: ${DB_NAME}`);

  const stats = {
    totalCards: 0,
    skippedInvalidTelegram: 0,
    createdUsers: 0,
    linkedExistingUsers: 0,
    normalizedCards: 0,
    upgradedFromAudit: 0,
  };

  try {
    const cards = await EmployeeNamecardModel.find({
      createdByOperator: { $ne: null },
      status: { $ne: 2 },
    }).select(
      "_id telegram_username createdByOperator name_english email updatedAt",
    );

    stats.totalCards = cards.length;
    console.log(`Found ${cards.length} operator-created active namecards`);

    for (const card of cards) {
      const normalizedTelegram = normalizeTelegramUsername(
        card.telegram_username,
      );
      if (!normalizedTelegram) {
        stats.skippedInvalidTelegram += 1;
        continue;
      }

      if (card.telegram_username !== normalizedTelegram) {
        card.telegram_username = normalizedTelegram;
        await card.save();
        stats.normalizedCards += 1;
      }

      const existingUser = await findUserByTelegramUsername(normalizedTelegram);
      if (existingUser) {
        const existingStartDate =
          existingUser.startdate || moment().format("YYYY-MM-DD");
        const existingEndDate = moment(existingStartDate, "YYYY-MM-DD")
          .add(99, "years")
          .format("YYYY-MM-DD");

        const existingUpdates = {
          membertype: "premium",
          membershiperiod: 99 * 12,
          startdate: existingStartDate,
          enddate: existingEndDate,
          paymentstatus: 1,
          paymentBy: existingUser.paymentBy || 7,
        };

        if (
          !existingUser.createdByOperator &&
          existingUser.usertype === 1 &&
          card.createdByOperator
        ) {
          existingUpdates.createdByOperator = card.createdByOperator;
          stats.linkedExistingUsers += 1;
        }

        if (existingUser.usertype === 1) {
          await UserModel.findByIdAndUpdate(existingUser._id, existingUpdates);
        }
        continue;
      }

      const freeUsername = await generateUniqueFreeUsername();
      const activeUsername = await buildActiveUsername(normalizedTelegram);
      if (!activeUsername) {
        stats.skippedInvalidTelegram += 1;
        continue;
      }

      const startDate = moment().format("YYYY-MM-DD");
      const endDate = moment().add(99, "years").format("YYYY-MM-DD");

      const user = new UserModel({
        username: activeUsername,
        freeUsername,
        tgid: normalizedTelegram,
        email: card.email || null,
        firstname: card.name_english || "Employee",
        usertype: 1,
        membertype: "premium",
        membershiperiod: 99 * 12,
        startdate: startDate,
        enddate: endDate,
        paymentstatus: 1,
        paymentBy: 7,
        memberid: await generateEnterpriseMemberId(),
        createdByOperator: card.createdByOperator,
      });
      await user.save();
      stats.createdUsers += 1;
    }

    // Upgrade any employee users created by operator/donator flows to 99-year premium
    // based on enterprise audit logs.
    const auditLogs = await EnterpriseAuditModel.find({
      actorType: { $in: ["operator", "donator"] },
      action: { $in: ["employee.create", "employee.stage1"] },
      entityType: "User",
    }).select("entityId");

    const userIds = Array.from(
      new Set(
        auditLogs
          .map((a) => String(a.entityId || ""))
          .filter((id) => mongoose.Types.ObjectId.isValid(id)),
      ),
    );

    for (const userId of userIds) {
      const user = await UserModel.findById(userId);
      if (!user || user.usertype !== 1) continue;

      const startDate = user.startdate || moment().format("YYYY-MM-DD");
      const endDate = moment(startDate, "YYYY-MM-DD")
        .add(99, "years")
        .format("YYYY-MM-DD");

      await UserModel.findByIdAndUpdate(user._id, {
        membertype: "premium",
        membershiperiod: 99 * 12,
        startdate: startDate,
        enddate: endDate,
        paymentstatus: 1,
        paymentBy: user.paymentBy || 7,
      });
      stats.upgradedFromAudit += 1;
    }

    console.log("Backfill completed.");
    console.log(JSON.stringify(stats, null, 2));
  } finally {
    await mongoose.connection.close();
    console.log("DB connection closed.");
  }
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
