import postgres from "postgres";
import crypto from "crypto";

const sql = postgres("postgresql://postgres:ssJUNcNLNPNXDVTbOazkuyRSkomhgpHH@yamabiko.proxy.rlwy.net:21022/railway");

async function migrate() {
  const updated = await sql`
    UPDATE pipeline_stages 
    SET name = 'Enviar Cotizacion'
    WHERE name = 'Pendiente de Calificacion'
  `;
  console.log(updated.count > 0 ? "✅ Renombrada: Pendiente → Enviar Cotizacion" : "⚠️  Ya estaba renombrada");

  const etapas = [
    { name: "Proveedor", order: 8,  color: "#0891b2" },
    { name: "Personal",  order: 9,  color: "#7c3aed" },
    { name: "Referido",  order: 10, color: "#059669" },
  ];

  for (const e of etapas) {
    const result = await sql`
      INSERT INTO pipeline_stages (id, name, "order", color, is_won, is_lost)
      SELECT ${crypto.randomUUID()}, ${e.name}, ${e.order}, ${e.color}, false, false
      WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE name = ${e.name})
    `;
    console.log(result.count > 0 ? `✅ Agregada: ${e.name}` : `⚠️  Ya existe: ${e.name}`);
  }

  await sql.end();
  console.log("\n✅ Migración ARG completada — datos intactos");
}

migrate().catch(console.error);