import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  try {
    const [rows] = await db.query<RowDataPacket[]>(`SELECT id, name, email, role, club_code FROM users WHERE email = ?`, [email]);
    if (rows.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed", details: (error as Error).message }, { status: 500 });
  }
};
