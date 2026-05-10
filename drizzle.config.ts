import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:OgkqSTotxJosRHihBKxGVyzbBKECVwlq@trolley.proxy.rlwy.net:54502/railway",
  },
});