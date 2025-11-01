import { DreamDB } from "../src/index.js";

async function demo() {
  const db = await DreamDB.connect({ connectionString: "./demo/dataset.sqlite" });

  // Insert new row
  await db.insert("users", { name: "Charlie", last_active: "2025-10-10", notes: "Paused 2 months" });

  // Ask
  const res = await db.ask("users who took a multi-month break");
  console.log(res);
}

demo();
