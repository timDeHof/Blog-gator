import { defineConfig } from "drizzle-kit";
import { readConfig } from "./src/config";

const config = readConfig();

export default defineConfig({
  schema: "src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: config.dbUrl,
  },
});
