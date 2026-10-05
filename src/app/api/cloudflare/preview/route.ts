import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';

async function verifyAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("proxypanel_session")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = await verifyAuth();
  if (!user || String(user.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { password } = await request.json();
    
    // Verify password
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Fetch credentials
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["CF_EMAIL", "CF_API_TOKEN"] } }
    });
    
    const email = settings.find(s => s.key === "CF_EMAIL")?.value || "";
    const token = settings.find(s => s.key === "CF_API_TOKEN")?.value || "";

    return NextResponse.json({ success: true, data: { email, token } });
  } catch (error) {
    return NextResponse.json({ error: "Failed to preview credentials" }, { status: 500 });
  }
}
