import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

// GET /api/users/profile?id=1 or ?email=
export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const email = searchParams.get("email");

  if (!id && !email) {
    return NextResponse.json({ error: "id or email required" }, { status: 400 });
  }

  try {
    const query = id
      ? `SELECT id, name, email, role, club_code FROM users WHERE id = ?`
      : `SELECT id, name, email, role, club_code FROM users WHERE email = ?`;
    const param = id ?? email;
    const [rows] = await db.query<RowDataPacket[]>(query, [param]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed", details: (error as Error).message }, { status: 500 });
  }
};

// PUT /api/users/profile  { id, name, email }
export const PUT = async (req: NextRequest) => {
  try {
    const { id, name, email } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!email || !String(email).trim()) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();

    // basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (trimmedName.length > 100) {
      return NextResponse.json({ error: "Name must be <= 100 characters" }, { status: 400 });
    }

    // check user exists
    const [existing] = await db.query<RowDataPacket[]>(`SELECT id, email FROM users WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentEmail = existing[0].email as string;

    // if email changed, check uniqueness
    if (trimmedEmail !== currentEmail.toLowerCase()) {
      const [dup] = await db.query<RowDataPacket[]>(`SELECT id FROM users WHERE email = ? AND id != ?`, [trimmedEmail, id]);
      if (dup.length > 0) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    await db.query(`UPDATE users SET name = ?, email = ? WHERE id = ?`, [trimmedName, trimmedEmail, id]);

    const [rows] = await db.query<RowDataPacket[]>(`SELECT id, name, email, role, club_code FROM users WHERE id = ?`, [id]);

    // normalize to match signin response (clubCode)
    const u = rows[0] as RowDataPacket & { id: number; name: string; email: string; role: string; club_code: string | null };
    const userData = {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      clubCode: u.club_code ?? null,
      club_code: u.club_code ?? null,
    };

    return NextResponse.json({ user: userData, message: "Profile updated" });
  } catch (error) {
    console.error("PUT /api/users/profile error:", error);
    return NextResponse.json({ error: "Failed to update profile", details: (error as Error).message }, { status: 500 });
  }
};
