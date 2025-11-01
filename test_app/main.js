import { DreamDB } from "@yakshith/dreamdb";

const db = new DreamDB({ path: "users.db" });
await db.insert("users", { name: "Bob", notes: "Paused for a bit" });
const res = await db.query("users who paused a while");
console.log(res);
