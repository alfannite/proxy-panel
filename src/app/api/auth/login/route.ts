import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // 1. Cari user di database
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({ error: "Username atau password salah!" }, { status: 401 });
    }

    // 2. Cek Password pakai Bcrypt
    // Karena saat ini password kamu di database masih plain text (belum di-hash),
    // Untuk masa transisi, kita akan nge-cek dua-duanya. 
    // Nanti setelah kamu ngupdate password ke bentuk hash di database, baru plain text-nya dihapus.
    let isPasswordMatch = false;
    
    // Cek apakah formatnya hash (dimulai dengan $2)
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      isPasswordMatch = await bcrypt.compare(password, user.password);
    } else {
      // (Transisi): Cek pakai plain text kalau datanya masih data lama
      isPasswordMatch = user.password === password;
    }

    if (!isPasswordMatch) {
      return NextResponse.json({ error: "Username atau password salah!" }, { status: 401 });
    }

    // 3. Bikin Tiket JWT Super Aman pakai Jose
    const secret = new TextEncoder().encode(JWT_SECRET);
    const jwtToken = await new SignJWT({ 
        id: user.id, 
        username: user.username,
        role: "admin"
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // Expired dalam 7 hari
      .sign(secret);

    // 4. Set Cookie dengan JWT
    const response = NextResponse.json({ message: "Login berhasil!" }, { status: 200 });
    
    response.cookies.set({
      name: "proxypanel_session",
      value: jwtToken,
      httpOnly: true,
      secure: false, // Ubah jadi false karena akses lewat IP (HTTP)
      sameSite: "lax",
      path: "/", // SANGAT PENTING: Biar token berlaku di semua halaman
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
