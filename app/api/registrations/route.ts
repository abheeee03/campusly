import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");
  const studentId = searchParams.get("student_id");
  try {
    if (eventId) {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT r.id, r.student_id, r.event_id, u.name, u.email, e.title, e.event_date
         FROM registrations r
         JOIN users u ON r.student_id = u.id
         JOIN events e ON r.event_id = e.id
         WHERE r.event_id = ? ORDER BY r.id DESC`, [eventId]
      );
      return NextResponse.json({ registrations: rows });
    }
    if (studentId) {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT r.id, r.event_id, e.title, e.description, e.event_date, e.createdAt
         FROM registrations r JOIN events e ON r.event_id = e.id
         WHERE r.student_id = ? ORDER BY e.event_date ASC`, [studentId]
      );
      return NextResponse.json({ registrations: rows });
    }
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT r.id, r.student_id, r.event_id, u.name, u.email, e.title FROM registrations r JOIN users u ON r.student_id=u.id JOIN events e ON r.event_id=e.id ORDER BY r.id DESC`
    );
    return NextResponse.json({ registrations: rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch registrations", details: (error as Error).message }, { status: 500 });
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const { student_id, event_id } = await req.json();
    if (!student_id || !event_id) return NextResponse.json({ error: "student_id and event_id required" }, { status: 400 });

    // check exists
    const [existing] = await db.query<RowDataPacket[]>(`SELECT id FROM registrations WHERE student_id = ? AND event_id = ?`, [student_id, event_id]);
    if (existing.length > 0) return NextResponse.json({ error: "Already registered for this event" }, { status: 400 });

    const [eventRows] = await db.query<RowDataPacket[]>(`SELECT id FROM events WHERE id = ?`, [event_id]);
    if (eventRows.length === 0) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const [userRows] = await db.query<RowDataPacket[]>(`SELECT id FROM users WHERE id = ?`, [student_id]);
    if (userRows.length === 0) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const [result] = await db.query(`INSERT INTO registrations (student_id, event_id) VALUES (?, ?)`, [student_id, event_id]) as unknown as [import("mysql2").ResultSetHeader, unknown];
    return NextResponse.json({ id: result.insertId, message: "Registered successfully" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to register", details: (error as Error).message }, { status: 500 });
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const student_id = searchParams.get("student_id");
    const event_id = searchParams.get("event_id");

    if (id) {
      const [res] = await db.query(`DELETE FROM registrations WHERE id = ?`, [id]) as unknown as [import("mysql2").ResultSetHeader, unknown];
      if (res.affectedRows === 0) return NextResponse.json({ error: "Registration not found" }, { status: 404 });
      return NextResponse.json({ message: "Registration cancelled" });
    }
    if (student_id && event_id) {
      const [res] = await db.query(`DELETE FROM registrations WHERE student_id = ? AND event_id = ?`, [student_id, event_id]) as unknown as [import("mysql2").ResultSetHeader, unknown];
      if (res.affectedRows === 0) return NextResponse.json({ error: "Registration not found" }, { status: 404 });
      return NextResponse.json({ message: "Registration cancelled" });
    }
    return NextResponse.json({ error: "id or student_id+event_id required" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete registration", details: (error as Error).message }, { status: 500 });
  }
};
