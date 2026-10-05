import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import yaml from "yaml";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';

const TRAEFIK_DIR = process.env.NODE_ENV === 'production' 
  ? '/opt/proxy/traefik-core' 
  : path.join(process.cwd(), '../');

// Fungsi bantuan buat ngecek JWT di rute API
async function verifyAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("proxypanel_session")?.value;
  if (!token) return null;
  
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload; // Isinya { id, username, role }
  } catch (error) {
    return null;
  }
}

// 1. GET: Ambil semua pengaturan
export async function GET() {
  const user = await verifyAuth();
  if (!user || String(user.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized. Harus login sebagai Admin." }, { status: 401 });
  }

  try {
    const settings = await prisma.setting.findMany();
    // Format array ke object dictionary { KEY: VALUE } biar gampang dibaca di Frontend
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => settingsMap[s.key] = s.value);
    
    return NextResponse.json({ success: true, data: settingsMap });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil data pengaturan" }, { status: 500 });
  }
}

// 2. POST: Simpan atau Update pengaturan
export async function POST(request: Request) {
  const user = await verifyAuth();
  if (!user || String(user.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized. Harus login sebagai Admin." }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { key, value } = data;

    if (!key || typeof value === "undefined") {
      return NextResponse.json({ error: "Key dan Value tidak boleh kosong" }, { status: 400 });
    }

    // Upsert: Kalau key udah ada, update. Kalau belum ada, create baru.
    const setting = await prisma.setting.upsert({
      where: { key: key },
      update: { value: String(value) },
      create: { key: key, value: String(value) },
    });

    let warning = null;

    // OTOMATIS UPDATE TRAEFIK.YML, ACME.JSON, & ENV TRAEFIK
    try {
      if (!fs.existsSync(TRAEFIK_DIR)) {
        fs.mkdirSync(TRAEFIK_DIR, { recursive: true });
      }

      // Jika update Email CF
      if (key === "CF_EMAIL") {
        const traefikYmlPath = path.join(TRAEFIK_DIR, "traefik.yml");
        
        // Template default traefik.yml jika belum ada
        let parsed: any = {
          entryPoints: {
            web: { address: ":80" },
            websecure: { address: ":443" }
          },
          providers: {
            file: { directory: "/opt/proxy/traefik-core/rules", watch: true }
          },
          certificatesResolvers: {
            cloudflare: {
              acme: {
                email: String(value),
                storage: "/opt/proxy/traefik-core/acme.json",
                dnsChallenge: {
                  provider: "cloudflare",
                  resolvers: ["1.1.1.1:53", "1.0.0.1:53"]
                }
              }
            }
          }
        };

        if (fs.existsSync(traefikYmlPath)) {
          let fileContent = fs.readFileSync(traefikYmlPath, "utf8");
          try {
            parsed = yaml.parse(fileContent) || parsed;
            if (!parsed.certificatesResolvers) parsed.certificatesResolvers = {};
            if (!parsed.certificatesResolvers.cloudflare) parsed.certificatesResolvers.cloudflare = { acme: { dnsChallenge: { provider: "cloudflare" } } };
            parsed.certificatesResolvers.cloudflare.acme.email = String(value);
            parsed.certificatesResolvers.cloudflare.acme.storage = "/opt/proxy/traefik-core/acme.json";
          } catch(e) {}
        }
        
        fs.writeFileSync(traefikYmlPath, yaml.stringify(parsed), "utf8");
        console.log(`Updated traefik.yml with email: ${value}`);

        // Pastikan acme.json ada dan permission 600
        const acmeJsonPath = path.join(TRAEFIK_DIR, "acme.json");
        if (!fs.existsSync(acmeJsonPath)) {
          fs.writeFileSync(acmeJsonPath, "");
        }
        fs.chmodSync(acmeJsonPath, 0o600);
      }

      // Jika update Token CF atau Email CF, kita simpan ke .env.traefik
      if (key === "CF_API_TOKEN" || key === "CF_EMAIL") {
        const envPath = path.join(TRAEFIK_DIR, ".env.traefik");
        let currentEnv = "";
        if (fs.existsSync(envPath)) {
          currentEnv = fs.readFileSync(envPath, "utf8");
        }
        
        // Parse current env
        const envLines = currentEnv.split('\n').filter(l => l.trim() !== '');
        const envMap: Record<string, string> = {};
        envLines.forEach(line => {
          const [k, ...v] = line.split('=');
          if (k && v) envMap[k] = v.join('=');
        });

        // Update
        if (key === "CF_API_TOKEN") envMap["CF_DNS_API_TOKEN"] = String(value);
        if (key === "CF_EMAIL") envMap["CF_EMAIL"] = String(value);

        // Save
        const newEnv = Object.entries(envMap).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
        fs.writeFileSync(envPath, newEnv);

        // Auto restart traefik via docker socket
        const http = require("http");
        const req = http.request({
          socketPath: '/var/run/docker.sock',
          path: '/containers/traefik-core/restart',
          method: 'POST',
        }, (res: any) => {
          console.log(`Traefik restarted, status: ${res.statusCode}`);
        });
        req.on('error', (e: any) => console.error("Docker restart error:", e));
        req.end();
      }

    } catch (err) {
      console.error("Error configuring Traefik:", err);
    }

    return NextResponse.json({ success: true, data: setting, warning: undefined });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
