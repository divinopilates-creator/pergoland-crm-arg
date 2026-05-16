import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities, deals, pipelineStages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const FIELD_MAP: Record<string, string> = {
  name: "name", nombre: "name", full_name: "name", fullname: "name",
  first_name: "name", nombre_completo: "name",
  email: "email", correo: "email", email_address: "email", correo_electronico: "email",
  phone: "phone", telefono: "phone", phone_number: "phone", cel: "phone",
  celular: "phone", whatsapp: "phone", movil: "phone",
  company: "company", empresa: "company", company_name: "company",
  negocio: "company", organizacion: "company",
  notes: "notes", notas: "notes", message: "notes", mensaje: "notes",
  comments: "notes", comentarios: "notes", descripcion: "notes",
  zona: "comuna", comuna: "comuna", medidas: "medidas", modelo: "modelo",
  tipo_cielo: "tipo_cielo", direccion: "direccion",
};

function extractFields(payload: Record<string, unknown>): Record<string, string> {
  const data = payload.data && typeof payload.data === "object"
    ? (payload.data as Record<string, unknown>)
    : payload;

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
    const mappedField = FIELD_MAP[normalizedKey];
    if (mappedField && !result[mappedField]) {
      result[mappedField] = String(value).trim();
    }
  }

  if (!result.name) {
    const firstName = data.first_name || data.nombre || data.firstName || data.primer_nombre;
    const lastName = data.last_name || data.apellido || data.lastName || data.apellidos;
    if (firstName) {
      result.name = [firstName, lastName].filter(Boolean).join(" ").trim();
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const fields = extractFields(payload);
  const isDistribuidor = payload.type === "distribuidor";
  const sourceOverride = typeof payload.source === "string" ? payload.source : undefined;

  if (fields.phone) {
    const existing = await db.select().from(contacts).where(eq(contacts.phone, fields.phone));
    if (existing[0]) {
      await db.update(contacts).set({
        email:      fields.email || existing[0].email || null,
        comuna:     fields.comuna || existing[0].comuna || null,
        medidas:    fields.medidas || existing[0].medidas || null,
        modelo:     fields.modelo || existing[0].modelo || null,
        tipo_cielo: fields.tipo_cielo || existing[0].tipo_cielo || null,
        direccion:  fields.direccion || existing[0].direccion || null,
        updatedAt:  new Date(),
      }).where(eq(contacts.phone, fields.phone));
      return NextResponse.json({ success: true, message: "Contacto actualizado" }, { status: 200 });
    }
  }

  if (!fields.name) {
    return NextResponse.json({ error: "Campo 'name' o 'nombre' es requerido" }, { status: 400 });
  }

  try {
    const now = new Date();
    const rows = await db.insert(contacts).values({
      name:        fields.name,
      email:       fields.email || null,
      phone:       fields.phone || null,
      company:     fields.company || null,
      source:      sourceOverride || "webhook",
      temperature: "cold",
      score:       0,
      notes:       fields.notes || null,
      comuna:      fields.comuna || null,
      medidas:     fields.medidas || null,
      modelo:      fields.modelo || null,
      tipo_cielo:  fields.tipo_cielo || null,
      direccion:   fields.direccion || null,
      createdAt:   now,
      updatedAt:   now,
    }).returning();
    const contact = rows[0];

    if (!isDistribuidor) {
      const stages = await db.select().from(pipelineStages).orderBy(asc(pipelineStages.order)).limit(1);
      const firstStage = stages[0];
      if (firstStage) {
        await db.insert(deals).values({
          title:     `Pérgola - ${fields.name}`,
          value:     0,
          stageId:   firstStage.id,
          contactId: contact.id,
          notes:     fields.notes || null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await db.insert(activities).values({
      type:        "note",
      description: isDistribuidor
        ? "Lead madera — derivar a distribuidor autorizado"
        : "Lead recibido via WhatsApp - Gian",
      contactId:  contact.id,
      createdAt:  now,
    });

    return NextResponse.json({
      success: true,
      contact: { id: contact.id, name: contact.name, email: contact.email, source: contact.source },
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { error: `Error al crear contacto: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}
