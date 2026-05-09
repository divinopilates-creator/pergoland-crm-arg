import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const contact = db.select().from(contacts).where(eq(contacts.id, params.id)).get();
  if (!contact) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const now = new Date();

  try {
    const updated = db
      .update(contacts)
      .set({
        name:                 typeof body.name === "string" ? body.name : undefined,
        email:                typeof body.email === "string" ? body.email || null : undefined,
        phone:                typeof body.phone === "string" ? body.phone || null : undefined,
        company:              typeof body.company === "string" ? body.company || null : undefined,
        source:               typeof body.source === "string" ? body.source : undefined,
        temperature:          typeof body.temperature === "string" ? body.temperature : undefined,
        notes:                typeof body.notes === "string" ? body.notes || null : undefined,
        comuna:               typeof body.comuna === "string" ? body.comuna || null : undefined,
        medidas:              typeof body.medidas === "string" ? body.medidas || null : undefined,
        modelo:               typeof body.modelo === "string" ? body.modelo || null : undefined,
        tipo_cielo:           typeof body.tipo_cielo === "string" ? body.tipo_cielo || null : undefined,
        presupuesto_estimado: typeof body.presupuesto_estimado === "number" ? body.presupuesto_estimado : null,
        fecha_visita:         body.fecha_visita ? new Date(body.fecha_visita as string) : null,
        direccion:            typeof body.direccion === "string" ? body.direccion || null : undefined,
        updatedAt:            now,
      })
      .where(eq(contacts.id, params.id))
      .returning()
      .get();

    if (!updated) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: `Error al actualizar: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    db.delete(contacts).where(eq(contacts.id, params.id)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Error al eliminar: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}