import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { pipelineStages } from "../src/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const stages = [
  { name: "Nuevo Lead",              order: 1, color: "#6366f1", isWon: false, isLost: false },
  { name: "Pendiente Calificación",  order: 2, color: "#f59e0b", isWon: false, isLost: false },
  { name: "Cotización Enviada",      order: 3, color: "#3b82f6", isWon: false, isLost: false },
  { name: "Visita Programada",       order: 4, color: "#8b5cf6", isWon: false, isLost: false },
  { name: "Negociación",             order: 5, color: "#ec4899", isWon: false, isLost: false },
  { name: "Ganado",                  order: 6, color: "#22c55e", isWon: true,  isLost: false },
  { name: "Perdido",                 order: 7, color: "#ef4444", isWon: false, isLost: true  },
];

async function seed() {
  console.log("Insertando etapas del pipeline...");
  for (const stage of stages) {
    await db.insert(pipelineStages).values(stage).onConflictDoNothing();
    console.log(`✅ ${stage.name}`);
  }
  console.log("Pipeline listo!");
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
