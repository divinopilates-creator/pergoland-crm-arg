import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pipelineStages, deals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existingDeals = await db.select().from(deals).where(eq(deals.stageId, id));
  if (existingDeals.length > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar una etapa con deals activos" },
      { status: 400 }
    );
  }

  try {
    await db.delete(pipelineStages).where(eq(pipelineStages.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Error al eliminar: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}