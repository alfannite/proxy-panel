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

// POST: Test Cloudflare connection with provided or saved credentials
export async function POST(request: Request) {
  const user = await verifyAuth();
  if (!user || String(user.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    let cfEmail = body.email?.trim();
    let cfToken = body.token?.trim();

    // If not provided in body, fall back to saved settings
    if (!cfEmail || !cfToken) {
      const settings = await prisma.setting.findMany({
        where: { key: { in: ["CF_EMAIL", "CF_API_TOKEN"] } }
      });
      cfEmail = cfEmail || settings.find(s => s.key === "CF_EMAIL")?.value?.trim();
      cfToken = cfToken || settings.find(s => s.key === "CF_API_TOKEN")?.value?.trim();
    }

    if (!cfToken) {
      return NextResponse.json({ 
        success: false, 
        error: "API Key/Token is required" 
      }, { status: 400 });
    }

    // Detect auth method
    const isGlobalKey = /^[a-f0-9]{37}$/i.test(cfToken);
    
    if (isGlobalKey && !cfEmail) {
      return NextResponse.json({ 
        success: false, 
        error: "Email is required for Global API Keys" 
      }, { status: 400 });
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    
    if (isGlobalKey) {
      headers["X-Auth-Email"] = cfEmail;
      headers["X-Auth-Key"] = cfToken;
    } else {
      headers["Authorization"] = `Bearer ${cfToken}`;
    }

    // Test with /user/tokens/verify for API Tokens, or /user for Global Keys
    let authName = "Unknown";
    let isAuthorized = false;

    if (!isGlobalKey) {
      const verifyRes = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
        headers,
        cache: 'no-store'
      });
      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        isAuthorized = true;
        authName = "API Token User"; // They don't expose email in token verify
      } else {
        return NextResponse.json({
          success: false,
          error: verifyData.errors?.[0]?.message || "Invalid API Token",
          authMethod: 'API Token'
        }, { status: 401 });
      }
    } else {
      const userRes = await fetch("https://api.cloudflare.com/client/v4/user", {
        headers,
        cache: 'no-store'
      });
      const userData = await userRes.json();
      if (userData.success) {
        isAuthorized = true;
        authName = userData.result?.email;
      } else {
        return NextResponse.json({
          success: false,
          error: userData.errors?.[0]?.message || "Invalid Global API Key",
          authMethod: 'Global API Key'
        }, { status: 401 });
      }
    }

    // Also fetch zones to verify zone permissions
    const zonesRes = await fetch("https://api.cloudflare.com/client/v4/zones?per_page=1", {
      headers,
      cache: 'no-store'
    });
    const zonesData = await zonesRes.json();
    
    if (!zonesData.success) {
      return NextResponse.json({
        success: false,
        error: zonesData.errors?.[0]?.message || "Token missing Zone Read permission",
        authMethod: isGlobalKey ? 'Global API Key' : 'API Token'
      }, { status: 401 });
    }

    let displayEmail = authName && authName.includes('@') ? authName : (cfEmail || 'Unknown');
    if (displayEmail.includes('@')) {
      const [name, domain] = displayEmail.split('@');
      if (name.length > 2) {
        displayEmail = name.substring(0, 2) + '*'.repeat(name.length - 2) + '@' + domain;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        email: displayEmail,
        name: authName || 'Cloudflare User',
        accountType: 'Authorized',
        totalZones: zonesData.result_info?.total_count || 0,
        authMethod: isGlobalKey ? 'Global API Key' : 'API Token'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Network error: ${error?.message || 'Could not reach Cloudflare'}`
    }, { status: 500 });
  }
}
