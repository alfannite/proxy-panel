import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

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

export async function GET() {
  const user = await verifyAuth();
  if (!user || String(user.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["CF_EMAIL", "CF_API_TOKEN"] } }
    });
    
    const cfEmail = settings.find(s => s.key === "CF_EMAIL")?.value?.trim();
    const cfToken = settings.find(s => s.key === "CF_API_TOKEN")?.value?.trim();

    if (!cfEmail || !cfToken) {
      return NextResponse.json({ 
        success: false, 
        error: "Cloudflare credentials not configured. Go to Profile & Security to add them." 
      }, { status: 400 });
    }

    // Cloudflare supports two auth methods:
    // 1. Global API Key: X-Auth-Email + X-Auth-Key
    // 2. API Token (Bearer): Authorization: Bearer <token>
    // Global API Keys are 37 chars and contain only hex. API Tokens are longer.
    // We try Global API Key first (since the label says "Global API Key").
    const isGlobalKey = /^[a-f0-9]{37}$/i.test(cfToken);

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (isGlobalKey) {
      // Global API Key method
      headers["X-Auth-Email"] = cfEmail;
      headers["X-Auth-Key"] = cfToken;
    } else {
      // API Token (Bearer) method
      headers["Authorization"] = `Bearer ${cfToken}`;
    }

    console.log(`[Cloudflare Zones] Attempting to fetch zones using ${isGlobalKey ? 'Global API Key' : 'API Token (Bearer)'} method for email: ${cfEmail}`);

    const res = await fetch("https://api.cloudflare.com/client/v4/zones?per_page=50&status=active", {
      headers,
      // Prevent caching
      cache: 'no-store'
    });

    const data = await res.json();

    if (!data.success) {
      const errorMsg = data.errors?.[0]?.message || "Authentication failed";
      const errorCode = data.errors?.[0]?.code || res.status;
      console.error(`[Cloudflare Zones] API Error: ${errorMsg} (code: ${errorCode})`);
      
      return NextResponse.json({ 
        success: false, 
        error: `Cloudflare API Error: ${errorMsg}`,
        details: {
          code: errorCode,
          authMethod: isGlobalKey ? 'Global API Key' : 'API Token',
          hint: isGlobalKey 
            ? "Make sure the Global API Key is correct. Find it at: Cloudflare > My Profile > API Tokens > Global API Key" 
            : "Make sure the API Token has 'Zone:Read' and 'DNS:Edit' permissions."
        }
      }, { status: 400 });
    }

    const zones = data.result.map((zone: any) => ({
      id: zone.id,
      name: zone.name,
      status: zone.status,
      plan: zone.plan?.name || 'Free'
    }));

    console.log(`[Cloudflare Zones] Successfully fetched ${zones.length} zone(s)`);

    return NextResponse.json({ 
      success: true, 
      data: zones,
      meta: {
        total: zones.length,
        authMethod: isGlobalKey ? 'Global API Key' : 'API Token'
      }
    });
  } catch (error: any) {
    console.error("[Cloudflare Zones] Internal Error:", error?.message || error);
    return NextResponse.json({ 
      success: false, 
      error: `Connection error: ${error?.message || 'Could not reach Cloudflare API. Check network/DNS.'}` 
    }, { status: 500 });
  }
}
