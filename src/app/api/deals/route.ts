import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deals, contacts, pipelineStages } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export async function GET() {
  const results = await db.select({
    id: deals.id, title: deals.title, value: deals.value,
    stageId: deals.stageId, contactId: deals.contactId,
    expectedClose: deals.expectedClose, probability: deals.probability,
    notes: deals.notes, createdAt: deals.createdAt, updatedAt: deals.updatedAt,
    contactName: contacts.name, contactEmail: contacts.email,
    contactTemperature: contacts.temperature,
    stageName: pipelineStages.name, stageColor: pipelineStages.color,
    stageOrder: pipelineStages.order, stageIsWon: pipelineStages.isWon,
    stageIsLost: pipelineStages.isLost,
  })
  .from(deals)
  .leftJoin(contacts, eq(deals.contactId, contacts.id))
  .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
  .orderBy(desc(deals.createdAt));

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const { title, value, stageId, contactId, expectedClose, probability, notes } = body;
  if (!title || !contactId) {
    return NextResponse.json({ error: "Titulo y contacto son requeridos" }, { status: 400 });
  }

  let finalStageId = stageId;
  if (!finalStageId) {
    const stages = await db.select().from(pipelineStages).orderBy(asc(pipelineStages.order)).limit(1);
    finalStageId = stages[0]?.id;
  }
  if (!finalStageId) {
    return NextResponse.json({ error: "No hay etapas de pipeline configuradas" }, { status: 400 });
  }

  try {
    const now = new Date();
    const rows = await db.insert(deals).values({
      title, value: value || 0, stageId: finalStageId, contactId,
      expectedClose: expectedClose ? new Date(expectedClose) : null,
      probability: Math.max(0, Math.min(100, Number(probability) || 0)),
      notes: notes || null, createdAt: now, updatedAt: now,
    }).returning();
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    return NextResponse.json({ error: `Error al crear deal: ${msg}` }, { status: 500 });
  }
}