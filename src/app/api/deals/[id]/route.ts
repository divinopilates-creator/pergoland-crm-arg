import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db.select().from(deals).where(eq(deals.id, id));
  if (!rows[0]) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  try {
    const rows = await db.update(deals).set({
      title:         typeof body.title === "string" ? body.title : undefined,
      value:         typeof body.value === "number" ? body.value : undefined,
      stageId:       typeof body.stageId === "string" ? body.stageId : undefined,
      probability:   typeof body.probability === "number" ? body.probability : undefined,
      notes:         typeof body.notes === "string" ? body.notes || null : undefined,
      expectedClose: body.expectedClose ? new Date(body.expectedClose) : null,
      updatedAt:     new Date(),
    })
    .where(eq(deals.id, id))
    .returning();

    if (!rows[0]) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json(
      { error: `Error al actualizar: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.delete(deals).where(eq(deals.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Error al eliminar: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}