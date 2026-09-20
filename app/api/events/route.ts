import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export const GET = async () => {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT e.*, 
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as registration_count
       FROM events e ORDER BY e.event_date ASC`
    );
    return NextResponse.json({ events: rows });
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json({ error: "Failed to fetch events", details: (error as Error).message }, { status: 500 });
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const { title, description, event_date } = await req.json();

    if (!title || !event_date) {
      return NextResponse.json({ error: "title and event_date are required" }, { status: 400 });
    }
    if (String(title).length > 30) {
      return NextResponse.json({ error: "title must be <= 30 chars" }, { status: 400 });
    }
    if (description && String(description).length > 2000) {
      return NextResponse.json({ error: "description must be <= 2000 chars" }, { status: 400 });
    }

    const [result] = await db.query(
      `INSERT INTO events (title, description, event_date) VALUES (?, ?, ?)`,
      [title, description || null, event_date]
    ) as unknown as [import("mysql2").ResultSetHeader, unknown];

    const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM events WHERE id = ?`, [result.insertId]);

    return NextResponse.json({ event: rows[0], message: "Event created" }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Failed to create event", details: (error as Error).message }, { status: 500 });
  }
};
