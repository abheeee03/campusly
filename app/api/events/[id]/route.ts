import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export const GET = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM events WHERE id = ?`, [id]);
    if (rows.length === 0) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    const [regs] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email FROM registrations r JOIN users u ON r.student_id = u.id WHERE r.event_id = ?`,
      [id]
    );
    return NextResponse.json({ event: rows[0], registrations: regs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch event", details: (error as Error).message }, { status: 500 });
  }
};

export const PUT = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const { title, description, event_date } = await req.json();
    if (!title || !event_date) return NextResponse.json({ error: "title and event_date required" }, { status: 400 });
    if (String(title).length > 30) return NextResponse.json({ error: "title must be <= 30 chars" }, { status: 400 });

    const [result] = await db.query(
      `UPDATE events SET title = ?, description = ?, event_date = ? WHERE id = ?`,
      [title, description || null, event_date, id]
    ) as unknown as [import("mysql2").ResultSetHeader, unknown];

    if (result.affectedRows === 0) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM events WHERE id = ?`, [id]);
    return NextResponse.json({ event: rows[0], message: "Event updated" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update event", details: (error as Error).message }, { status: 500 });
  }
};

export const DELETE = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    await db.query(`DELETE FROM registrations WHERE event_id = ?`, [id]);
    const [result] = await db.query(`DELETE FROM events WHERE id = ?`, [id]) as unknown as [import("mysql2").ResultSetHeader, unknown];
    if (result.affectedRows === 0) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json({ message: "Event deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete event", details: (error as Error).message }, { status: 500 });
  }
};
