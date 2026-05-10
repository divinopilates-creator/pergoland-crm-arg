import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  let body: { contactId: string; activityId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { contactId, activityId } = body;
  if (!contactId || !activityId) {
    return NextResponse.json({ error: "contactId y activityId son requeridos" }, { status: 400 });
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: "Email no configurado" }, { status: 500 });
  }

  const contactRows = await db.select().from(contacts).where(eq(contacts.id, contactId));
  const contact = contactRows[0];
  if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  if (!contact.email) return NextResponse.json({ error: "El contacto no tiene email" }, { status: 400 });

  const activityRows = await db.select().from(activities).where(eq(activities.id, activityId));
  const activity = activityRows[0];
  if (!activity) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });

  const attachments = [];
  if (activity.attachmentPath) {
    const fullPath = path.join(process.cwd(), "data", activity.attachmentPath);
    if (fs.existsSync(fullPath)) {
      attachments.push({
        filename: path.basename(fullPath),
        content: fs.readFileSync(fullPath),
        contentType: "application/pdf",
      });
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtppro.zoho.com", port: 465, secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({
      from: `"Pergoland Chile" <${process.env.GMAIL_USER}>`,
      to: contact.email,
      subject: `Cotización Pergoland - ${contact.name}`,
      html: `
        <p>Estimado/a <strong>${contact.name}</strong>,</p>
        <p>Adjuntamos la cotización solicitada para su proyecto de pérgola.</p>
        <p>Quedamos a su disposición para cualquier consulta.</p>
        <br>
        <p>Saludos,<br><strong>Equipo Pergoland Chile</strong></p>
      `,
      attachments,
    });
    return NextResponse.json({ success: true, to: contact.email });
  } catch (error) {
    return NextResponse.json({
      error: `Error al enviar: ${error instanceof Error ? error.message : "Unknown"}`,
    }, { status: 500 });
  }
}