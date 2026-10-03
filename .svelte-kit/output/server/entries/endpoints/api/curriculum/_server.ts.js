import { json } from "@sveltejs/kit";
import { r as reviewItems, m as mappings, n as nodes } from "../../../../chunks/seed.js";
function GET() {
  return json({ nodes, mappings, reviewItems, updatedAt: "2026-09-29T08:42:00+08:00" });
}
export {
  GET
};
