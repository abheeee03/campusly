import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server"
import bcrypt from 'bcrypt'
import { User } from "@/lib/types";
import { RowDataPacket } from "mysql2";

type DatabaseUser = RowDataPacket & User

export const POST = async (req: NextRequest) => {    
    try {
        const { email, password, role, clubCode } = await req.json();

        if (!email || !password || !role) {
            NextResponse.json({
                error: "required credentials"
            })
        }

        let [data] = await db.query<DatabaseUser[]>(
            `SELECT * FROM users WHERE email = ?`, [email]
        );

        if (data.length == 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const user = data[0];

        let correctPass = await bcrypt.compare(password, user.password);

        if(!correctPass) {
            return NextResponse.json({
                error: "wrong credentials"
            }, {status: 400})
        }

        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            clubCode: (user as unknown as { club_code: string | null }).club_code ?? user.clubCode ?? null
        }

        return NextResponse.json({
            user: userData
        })
    } catch (error) {
        console.error("DB Error:", error);
        return NextResponse.json(
            { error: "Something went wrong", details: (error as Error).message },
            { status: 500 }
        )
    }
}