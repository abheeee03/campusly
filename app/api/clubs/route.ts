import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (code) {
      const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM clubs WHERE code = ?`, [code]);
      if (rows.length === 0) return NextResponse.json({ club: null }, { status: 404 });
      return NextResponse.json({ club: rows[0] });
    }
    const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM clubs ORDER BY createdAt DESC`);
    return NextResponse.json({ clubs: rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch clubs", details: (error as Error).message }, { status: 500 });
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const { name, code, slogan, img, adminId, adminEmail } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }
    if (String(name).length > 20) return NextResponse.json({ error: "name must be <= 20 chars" }, { status: 400 });
    if (String(code).length > 10) return NextResponse.json({ error: "code must be <= 10 chars" }, { status: 400 });
    if (slogan && String(slogan).length > 100) return NextResponse.json({ error: "slogan must be <= 100 chars" }, { status: 400 });
    if (img && String(img).length > 500) return NextResponse.json({ error: "img must be <= 500 chars" }, { status: 400 });

    const [existing] = await db.query<RowDataPacket[]>(`SELECT id FROM clubs WHERE code = ?`, [code]);
    if (existing.length > 0) return NextResponse.json({ error: "Club code already exists" }, { status: 400 });

    const [result] = await db.query(`INSERT INTO clubs (name, code, slogan, img) VALUES (?, ?, ?, ?)`, [name, code, slogan || null, img || null]) as unknown as [import("mysql2").ResultSetHeader, unknown];

    // If adminId or adminEmail provided, link club to admin
    if (adminId) {
      await db.query(`UPDATE users SET club_code = ? WHERE id = ?`, [code, adminId]);
    } else if (adminEmail) {
      await db.query(`UPDATE users SET club_code = ? WHERE email = ?`, [code, adminEmail]);
    }

    const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM clubs WHERE id = ?`, [result.insertId]);
    return NextResponse.json({ club: rows[0], message: "Club created" }, { status: 201 });
  } catch (error) {
    console.error("POST /api/clubs error:", error);
    return NextResponse.json({ error: "Failed to create club", details: (error as Error).message }, { status: 500 });
  }
};
