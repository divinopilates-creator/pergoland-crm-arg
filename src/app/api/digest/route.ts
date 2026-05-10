import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, activities, pipelineStages } from "@/db/schema";
import { eq, asc, isNull } from "drizzle-orm";
import { formatCurrency } from "@/lib/constants";

export async function POST() {
  const apiKey = process.env.RESEND_API_KEY;
  const email = process.env.DIGEST_EMAIL;

  if (!apiKey || !email) {
    return NextResponse.json({ error: "Email digest no configurado" }, { status: 400 });
  }

  const allContacts = await db.select().from(contacts);
  const allDeals = await db.select().from(deals);
  const stages = await db.select().from(pipelineStages).orderBy(asc(pipelineStages.order));
  const pendingActivities = await db.select({
    id: activities.id,
    type: activities.type,
    description: activities.description,
    scheduledAt: activities.scheduledAt,
    contactName: contacts.name,
  })
  .from(activities)
  .leftJoin(contacts, eq(activities.contactId, contacts.id))
  .where(isNull(activities.completedAt));

  const now = Date.now();
  const overdue = pendingActivities.filter((a) =>
    a.scheduledAt && new Date(a.scheduledAt).getTime() < now
  );
  const hotLeads = allContacts.filter((c) => c.temperature === "hot");
  const activeDeals = allDeals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stageId);
    return stage && !stage.isWon && !stage.isLost;
  });
  const pipelineValue = activeDeals.reduce((sum, d) => sum + d.value, 0);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1e293b;">Pergoland CRM</h1>
      <p style="color: #64748b;">Resumen diario — ${new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}</p>
      <hr style="border-top: 1px solid #e2e8f0;" />
      ${overdue.length > 0 ? `
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: #dc2626; font-size: 16px;">Seguimientos vencidos (${overdue.length})</h2>
          <ul>${overdue.map((a) => `<li>${a.description} — ${a.contactName || "Sin contacto"}</li>`).join("")}</ul>
        </div>
      ` : ""}
      <p>Contactos: ${allContacts.length} | Deals activos: ${activeDeals.length} | Pipeline: ${formatCurrency(pipelineValue)}</p>
      ${hotLeads.length > 0 ? `
        <h3>Leads calientes (${hotLeads.length})</h3>
        <ul>${hotLeads.map((c) => `<li>${c.name}</li>`).join("")}</ul>
      ` : ""}
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: process.env.DIGEST_FROM || "Auto-CRM <onboarding@resend.dev>",
        to: [email],
        subject: `CRM Digest: ${overdue.length > 0 ? `${overdue.length} vencidos` : `${activeDeals.length} deals activos`}`,
        html,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Error de Resend: ${await res.text()}` }, { status: 500 });
    }
    const result = await res.json();
    return NextResponse.json({ success: true, emailId: result.id });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}