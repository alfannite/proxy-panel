import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 1. Cek Pertahanan: Apakah database sudah ada isinya?
    const userCount = await prisma.user.count();
    
    // Kalau sudah ada admin, BLOKIR KERAS! Biar gak ada orang lain yang bikin akun
    if (userCount > 0) {
      return NextResponse.json(
        { error: "Sistem sudah di-setup. Tidak bisa membuat akun baru dari jalur ini." }, 
        { status: 403 }
      );
    }

    // 2. Ambil data dari form setup
    const { username, password } = await request.json();

    if (!username || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Username wajib diisi dan Password minimal 6 karakter." }, 
        { status: 400 }
      );
    }

    // 3. ENKRIPSI KETAT: Hash password pakai bcrypt (Salt Rounds: 10)
    // Walaupun database dicuri/dibuka, password asli nggak bakal ketahuan!
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Simpan ke SQLite
    const newUser = await prisma.user.create({
      data: {
        username: username,
        password: hashedPassword,
        role: "ADMIN", // Orang pertama otomatis jadi Super Admin
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Instalasi sukses! Akun Administrator berhasil dibuat." 
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan server saat setup." }, { status: 500 });
  }
}
