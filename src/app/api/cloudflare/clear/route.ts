import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import yaml from "yaml";
import http from "http";

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

export async function DELETE() {
  const user = await verifyAuth();
  if (!user || String(user.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Hapus dari database
    await prisma.setting.deleteMany({
      where: { key: { in: ["CF_EMAIL", "CF_API_TOKEN", "CF_GLOBAL_KEY"] } }
    });

    // 2. Hapus dari .env.traefik
    const TRAEFIK_DIR = "/opt/proxy/traefik-core";
    const envPath = path.join(TRAEFIK_DIR, ".env.traefik");
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
    }

    // 3. Hapus dari traefik.yml
    const traefikYmlPath = path.join(TRAEFIK_DIR, "traefik.yml");
    if (fs.existsSync(traefikYmlPath)) {
      try {
        let parsed = yaml.parse(fs.readFileSync(traefikYmlPath, "utf8")) || {};
        if (parsed.certificatesResolvers && parsed.certificatesResolvers.cloudflare) {
          delete parsed.certificatesResolvers.cloudflare;
          fs.writeFileSync(traefikYmlPath, yaml.stringify(parsed), "utf8");
        }
      } catch(e) {}
    }

    // 4. Restart Traefik otomatis
    const req = http.request({
      socketPath: '/var/run/docker.sock',
      path: '/containers/traefik-core/restart',
      method: 'POST',
    }, (res) => {
      console.log(`Traefik restarted, status: ${res.statusCode}`);
    });
    req.on('error', (e) => console.error("Failed to restart traefik via socket", e));
    req.end();

    return NextResponse.json({ success: true, message: "Connection cleared successfully" });
  } catch (e) {
    return NextResponse.json({ error: "Failed to clear connection" }, { status: 500 });
  }
}
