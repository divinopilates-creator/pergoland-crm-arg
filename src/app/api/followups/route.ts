import { NextResponse } from "next/server";
import { db } from "@/db";
import { activities, contacts } from "@/db/schema";
import { eq, isNull, asc } from "drizzle-orm";

export async function GET() {
  const pendingFollowups = await db.select({
    id: activities.id,
    type: activities.type,
    description: activities.description,
    contactId: activities.contactId,
    dealId: activities.dealId,
    scheduledAt: activities.scheduledAt,
    completedAt: activities.completedAt,
    createdAt: activities.createdAt,
    contactName: contacts.name,
    contactCompany: contacts.company,
  })
  .from(activities)
  .leftJoin(contacts, eq(activities.contactId, contacts.id))
  .where(isNull(activities.completedAt))
  .orderBy(asc(activities.scheduledAt));

  const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date(); endOfDay.setHours(23,59,59,999);

  const categorized = {
    overdue: pendingFollowups.filter((f) =>
      f.scheduledAt && new Date(f.scheduledAt).getTime() < startOfDay.getTime()
    ),
    today: pendingFollowups.filter((f) =>
      f.scheduledAt &&
      new Date(f.scheduledAt) >= startOfDay &&
      new Date(f.scheduledAt) <= endOfDay
    ),
    upcoming: pendingFollowups.filter((f) =>
      f.scheduledAt && new Date(f.scheduledAt).getTime() > endOfDay.getTime()
    ),
    unscheduled: pendingFollowups.filter((f) => !f.scheduledAt),
  };

  return NextResponse.json(categorized);
}