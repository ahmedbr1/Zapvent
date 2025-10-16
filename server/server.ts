import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db";
import api from "./routes";

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

async function start() {
  await connectDB(process.env.MONGODB_URI || 'mongodb://localhost:27017/aclDB');
  app.listen(PORT, () => console.log(`✅ API listening on :${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
