import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();

    // 1. Dapatkan Token dari Cookie
    const cookieHeader = request.headers.get("cookie");
    const tokenMatch = cookieHeader?.match(/proxypanel_session=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verifikasi JWT dan ambil Username
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    if (!payload.username) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    const username = payload.username as string;

    // 3. Ambil data user dari DB
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 4. Verifikasi Current Password
    let isPasswordMatch = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    } else {
      isPasswordMatch = user.password === currentPassword; // Fallback plain text
    }

    if (!isPasswordMatch) {
      return NextResponse.json({ error: "Password saat ini salah!" }, { status: 403 });
    }

    // 5. Hash Password Baru
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 6. Update Password di Database
    await prisma.user.update({
      where: { username },
      data: { password: hashedPassword },
    });

    // Berhasil
    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });

  } catch (error) {
    console.error("Gagal update password:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
