import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server"
import bcrypt from 'bcrypt'

export const POST = async (req: NextRequest) => {
    try {
        const { email, name, password, role, clubCode } = await req.json();
        const finalRole = role === "admin" ? "admin" : "student";
        const code = clubCode ? String(clubCode).trim() : "";

        if (!email || !name || !password) {
            return NextResponse.json({ error: "name, email, password required" }, { status: 400 });
        }

        if (finalRole === "student" && !code) {
            return NextResponse.json({ error: "Club code is required for students" }, { status: 400 });
        }

        // if code provided, verify club exists (FK would fail otherwise)
        if (code) {
            const [clubRows] = await db.query(`SELECT code FROM clubs WHERE code = ?`, [code]) as unknown as [import("mysql2").RowDataPacket[], unknown];
            if ((clubRows as unknown as unknown[]).length === 0) {
                return NextResponse.json({ error: `Invalid club code: ${code} does not exist` }, { status: 400 });
            }
        }

        let hashedPassword = await bcrypt.hash(password, 8);

        if (!code) {
            let [data] = await db.query(
                `INSERT INTO users (email, name, password, role)
                VALUES (?, ?, ?, ?)`,
                [email, name, hashedPassword, finalRole]
            );
            return NextResponse.json({
                data,
                sucess: "user created!"
            })
        }

        let [data] = await db.query(
            `INSERT INTO users (email, name, password, role, club_code)
            VALUES (?, ?, ?, ?, ?)`,
            [email, name, hashedPassword, finalRole, code]
        );

        return NextResponse.json({
            data,
            sucess: "user created!"
        })
    } catch (error) {
        console.error("DB Error:", error);
        return NextResponse.json(
            { error: "Something went wrong", details: (error as Error).message },
            { status: 500 }
        )
    }
}