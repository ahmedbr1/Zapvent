import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db";
import api from "./routes";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", api);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

async function start() {
  await connectDB(process.env.MONGODB_URI as string);
  app.listen(PORT, () => console.log(`✅ API listening on :${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
