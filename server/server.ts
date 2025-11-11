import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db";
import api from "./routes";
import { startReminderScheduler } from "./services/notificationService";

const app = express();
const allowedOrigin =
  process.env.CLIENT_ORIGIN ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", api);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const DB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/aclDB";
const allowStartupWithoutDb =
  process.env.ALLOW_START_WITHOUT_DB === "true" || process.env.CI === "true";

async function ensureDatabaseConnection() {
  if (!allowStartupWithoutDb) {
    await connectDB(DB_URI);
    return;
  }

  try {
    await connectDB(DB_URI);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `[Startup] Proceeding without database connection (${reason}). ` +
        "Set ALLOW_START_WITHOUT_DB=false to enforce DB availability."
    );
  }
}

async function start() {
  await ensureDatabaseConnection();
  startReminderScheduler();
  app.listen(PORT, () => console.log(`✅ API listening on :${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
