import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import dns from 'dns/promises';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';

const RULES_DIR = process.env.NODE_ENV === 'production' 
  ? '/opt/proxy/traefik-core/rules' 
  : path.join(process.cwd(), '../rules');

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

// ============================================================
// CLOUDFLARE HELPERS (DRY)
// ============================================================

// Helper: Get Cloudflare credentials + auth headers
async function getCfAuthHeaders(): Promise<{ headers: Record<string, string>; cfEmail: string; cfToken: string } | null> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["CF_EMAIL", "CF_API_TOKEN"] } }
  });

  const cfEmail = settings.find(s => s.key === "CF_EMAIL")?.value?.trim() || "";
  const cfToken = settings.find(s => s.key === "CF_API_TOKEN")?.value?.trim() || "";

  if (!cfToken) {
    console.warn("[Cloudflare] API Token not found. Skipping Cloudflare operation.");
    return null;
  }

  const isGlobalKey = /^[a-f0-9]{37}$/i.test(cfToken);
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (isGlobalKey) {
    headers["X-Auth-Email"] = cfEmail;
    headers["X-Auth-Key"] = cfToken;
  } else {
    headers["Authorization"] = `Bearer ${cfToken}`;
  }

  return { headers, cfEmail, cfToken };
}

// Helper: Find Cloudflare Zone ID for a given domain
// e.g., domain "app.example.com" → finds zone for "example.com"
async function findZoneForDomain(domain: string, cfHeaders: Record<string, string>): Promise<{ zoneId: string; zoneName: string } | null> {
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/zones?per_page=50&status=active", {
      headers: cfHeaders,
      cache: 'no-store'
    });
    const data = await res.json();

    if (!data.success || !data.result) return null;

    // Find the zone whose name is a suffix of the domain
    for (const zone of data.result) {
      if (domain === zone.name || domain.endsWith(`.${zone.name}`)) {
        return { zoneId: zone.id, zoneName: zone.name };
      }
    }

    return null;
  } catch (error: any) {
    console.error("[Cloudflare] Error finding zone:", error?.message);
    return null;
  }
}

// Helper: Delete a Cloudflare DNS A-record by domain name
// Automatically finds the zone and record, then deletes it
async function deleteCloudflareDNSRecord(domain: string): Promise<{ success: boolean; error?: string }> {
  const auth = await getCfAuthHeaders();
  if (!auth) return { success: false, error: "Cloudflare credentials not configured" };

  try {
    // Step 1: Find which zone this domain belongs to
    const zoneInfo = await findZoneForDomain(domain, auth.headers);
    if (!zoneInfo) {
      console.warn(`[Cloudflare] No zone found for domain: ${domain}. Skipping DNS deletion.`);
      return { success: false, error: `No zone found for domain: ${domain}` };
    }

    // Step 2: Find the DNS A-record in that zone
    const listRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneInfo.zoneId}/dns_records?name=${domain}&type=A`,
      { headers: auth.headers, cache: 'no-store' }
    );
    const listData = await listRes.json();

    if (!listData.success || !listData.result || listData.result.length === 0) {
      console.warn(`[Cloudflare] No DNS A-record found for: ${domain}`);
      return { success: false, error: `No DNS record found for: ${domain}` };
    }

    // Step 3: Delete all matching A-records (usually just one)
    let deletedCount = 0;
    for (const record of listData.result) {
      const delRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneInfo.zoneId}/dns_records/${record.id}`,
        { method: "DELETE", headers: auth.headers }
      );
      const delData = await delRes.json();
      if (delData.success) {
        deletedCount++;
        console.log(`[Cloudflare] DNS A-record deleted: ${domain} (ID: ${record.id}, IP: ${record.content})`);
      } else {
        console.error(`[Cloudflare] Failed to delete DNS record ${record.id}: ${JSON.stringify(delData.errors)}`);
      }
    }

    return { success: deletedCount > 0 };
  } catch (error: any) {
    console.error("[Cloudflare] Error deleting DNS record:", error?.message);
    return { success: false, error: error?.message || "Network error" };
  }
}

// Helper: Create DNS A-Record via Cloudflare API
async function addCloudflareDNSRecord(
  zoneId: string, 
  subdomain: string, 
  rootDomain: string, 
  dnsIp: string, 
  proxied: boolean
) {
  const auth = await getCfAuthHeaders();
  if (!auth) return { success: false, error: "Cloudflare credentials not configured" };

  const fullDomain = subdomain === '@' ? rootDomain : `${subdomain}.${rootDomain}`;

  try {
    const recordRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
      method: "POST",
      headers: auth.headers,
      body: JSON.stringify({
        type: "A",
        name: fullDomain,
        content: dnsIp,
        ttl: 1, // 1 = Auto
        proxied: proxied
      })
    });

    const recordData = await recordRes.json();
    
    if (!recordData.success) {
      const errorMsg = recordData.errors?.[0]?.message || "Unknown error";
      console.error(`[Cloudflare] DNS creation failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
    
    console.log(`[Cloudflare] DNS A record created: ${fullDomain} -> ${dnsIp} (Proxied: ${proxied})`);
    return { success: true, domain: fullDomain };
  } catch (error: any) {
    console.error("[Cloudflare] API Error:", error?.message);
    return { success: false, error: error?.message || "Network error" };
  }
}

// Helper: Extract domain from a Traefik YAML file
function getDomainFromYaml(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.parse(content);
    if (parsed?.http?.routers) {
      const router = Object.values(parsed.http.routers)[0] as any;
      if (router?.rule) {
        const match = router.rule.match(/Host\(`([^`]+)`\)/);
        if (match) return match[1];
      }
    }
  } catch (e) {
    // Silently fail
  }
  return null;
}

// ============================================================
// API ROUTES
// ============================================================

// GET: List all proxy rules from Traefik YAML files
export async function GET() {
  const user = await verifyAuth();
  if (!user || String(user.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const httpDir = path.join(RULES_DIR, 'http');
    if (!fs.existsSync(httpDir)) fs.mkdirSync(httpDir, { recursive: true });

    const files = fs.readdirSync(httpDir).filter(file => 
      file.endsWith('.yml') || file.endsWith('.yaml') || file.endsWith('.disabled')
    );
    
    const proxies = files.map(file => {
      const fileContent = fs.readFileSync(path.join(httpDir, file), 'utf8');
      const parsed = yaml.parse(fileContent);
      
      let domain = "Unknown";
      let targetUrl = "Unknown";
      let serviceName = file.replace('.yml.disabled', '').replace('.yaml.disabled', '').replace('.yml', '').replace('.yaml', '');
      let status = file.endsWith('.disabled') ? 'stopped' : 'active';

      try {
        if (parsed?.http?.routers) {
          const router = Object.values(parsed.http.routers)[0] as any;
          if (router?.rule) {
            const match = router.rule.match(/Host\(`([^`]+)`\)/);
            if (match) domain = match[1];
          }
        }
        if (parsed?.http?.services) {
          const service = Object.values(parsed.http.services)[0] as any;
          if (service?.loadBalancer?.servers?.[0]?.url) {
            targetUrl = service.loadBalancer.servers[0].url;
          }
        }
      } catch (e) {
        // Silently fail parsing complex configs
      }

      return {
        filename: file,
        serviceName,
        domain,
        targetUrl,
        status,
        rawConfig: parsed
      };
    });

    // Optimize Cloudflare lookups by caching zone records if CF is connected
    const auth = await getCfAuthHeaders();
    let cfRecordsCache: any[] = [];
    
    if (auth) {
      try {
        // Fetch all zones to get records
        const zonesRes = await fetch("https://api.cloudflare.com/client/v4/zones?per_page=50&status=active", { headers: auth.headers });
        const zonesData = await zonesRes.json();
        if (zonesData.success && zonesData.result) {
          // For simplicity, just fetch records from the first few zones if they exist
          for (const zone of zonesData.result.slice(0, 3)) {
            const recRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records?type=A&per_page=100`, { headers: auth.headers });
            const recData = await recRes.json();
            if (recData.success && recData.result) {
              cfRecordsCache = [...cfRecordsCache, ...recData.result];
            }
          }
        }
      } catch (e) {
        // Ignore CF fetch errors
      }
    }

    const proxiesWithDNS = await Promise.all(proxies.map(async (proxy) => {
      let publicIp = "N/A";
      let realIp = "";
      
      if (proxy.domain !== "Unknown") {
        // First try to find it in Cloudflare Cache (REAL IP)
        const cfRecord = cfRecordsCache.find(r => r.name === proxy.domain);
        if (cfRecord) {
          realIp = cfRecord.content; // This is the actual IP they entered
        }

        // Then do normal DNS resolve for the masked IP
        try {
          const records = await dns.resolve4(proxy.domain);
          if (records && records.length > 0) {
            const parts = records[0].split('.');
            if (parts.length === 4 && (records[0].startsWith('104.') || records[0].startsWith('172.'))) {
              publicIp = `${parts[0]}.*.*.${parts[3]}`; // Masked CF IP
            } else {
              publicIp = records[0];
            }
          }
        } catch (e) {
          // ignore dns errors
        }
      }
      
      return { ...proxy, publicIp, realIp: realIp || publicIp };
    }));

    return NextResponse.json({ success: true, data: proxiesWithDNS });
  } catch (error) {
    console.error("Error reading proxies:", error);
    return NextResponse.json({ success: false, error: "Gagal membaca konfigurasi proxy" }, { status: 500 });
  }
}

// POST: Create a new proxy (Traefik YAML + Cloudflare DNS)
export async function POST(req: Request) {
  const user = await verifyAuth();
  if (!user || String(user.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      serviceName, 
      zoneId,
      rootDomain,
      subdomain,
      dnsIp,
      proxied,
      targetIp, 
      targetPort 
    } = body;

    // Build full domain from subdomain + rootDomain, or use legacy domain field
    let fullDomain = body.domain;
    if (!fullDomain && rootDomain && subdomain) {
      fullDomain = subdomain === '@' ? rootDomain : `${subdomain}.${rootDomain}`;
    }

    if (!fullDomain || !targetIp || !targetPort || !serviceName) {
      return NextResponse.json({ 
        success: false, 
        error: "All fields are required: serviceName, domain/subdomain, targetIp, targetPort" 
      }, { status: 400 });
    }

    // Sanitize service name (alphanumeric + hyphens only)
    const safeServiceName = serviceName.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    if (!safeServiceName) {
      return NextResponse.json({ success: false, error: "Invalid service name" }, { status: 400 });
    }

    const httpDir = path.join(RULES_DIR, 'http');
    if (!fs.existsSync(httpDir)) fs.mkdirSync(httpDir, { recursive: true });

    // Check if file already exists
    const fileName = `${safeServiceName}.yml`;
    const filePath = path.join(httpDir, fileName);
    if (fs.existsSync(filePath)) {
      return NextResponse.json({ 
        success: false, 
        error: `Service "${safeServiceName}" already exists. Delete it first or use a different name.` 
      }, { status: 409 });
    }

    // Generate Traefik YAML - exact format matching user's existing structure
    const newProxyConfig = {
      http: {
        routers: {
          [safeServiceName]: {
            rule: `Host(\`${fullDomain}\`)`,
            entryPoints: ["websecure"],
            tls: {
              certResolver: "cloudflare"
            },
            service: `${safeServiceName}-svc`
          }
        },
        services: {
          [`${safeServiceName}-svc`]: {
            loadBalancer: {
              servers: [
                { url: `http://${targetIp}:${targetPort}` }
              ]
            }
          }
        }
      }
    };

    const yamlStr = yaml.stringify(newProxyConfig);
    fs.writeFileSync(filePath, yamlStr, 'utf8');
    console.log(`[Traefik] Rule file created: ${fileName}`);

    // Create Cloudflare DNS record if zone data is provided
    let dnsResult = null;
    if (zoneId && dnsIp) {
      dnsResult = await addCloudflareDNSRecord(zoneId, subdomain, rootDomain, dnsIp, proxied ?? false);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Proxy created successfully!", 
      filename: fileName,
      domain: fullDomain,
      dns: dnsResult
    });
  } catch (error: any) {
    console.error("Error creating proxy:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to create proxy" }, { status: 500 });
  }
}

// DELETE: Remove a proxy rule + Cloudflare DNS record
export async function DELETE(req: Request) {
  const user = await verifyAuth();
  if (!user || String(user.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ success: false, error: "Filename is required" }, { status: 400 });
    }

    // Security: prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(RULES_DIR, 'http', safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: "Rule file not found" }, { status: 404 });
    }

    // Step 1: Read domain from YAML before deleting
    const domain = getDomainFromYaml(filePath);

    // Step 2: Delete Cloudflare DNS record for this domain
    let dnsResult = null;
    if (domain && domain !== "Unknown") {
      console.log(`[Delete] Attempting to clean up Cloudflare DNS for: ${domain}`);
      dnsResult = await deleteCloudflareDNSRecord(domain);
      if (dnsResult.success) {
        console.log(`[Delete] Cloudflare DNS record for ${domain} cleaned up successfully`);
      } else {
        console.warn(`[Delete] Cloudflare DNS cleanup note: ${dnsResult.error} (proceeding with file deletion anyway)`);
      }
    } else {
      console.warn(`[Delete] Could not extract domain from ${safeFilename}, skipping Cloudflare cleanup`);
    }

    // Step 3: Delete the Traefik YAML file
    fs.unlinkSync(filePath);
    console.log(`[Traefik] Rule file deleted: ${safeFilename}`);

    return NextResponse.json({ 
      success: true, 
      message: `Proxy "${safeFilename}" deleted successfully`,
      dns: dnsResult
    });
  } catch (error: any) {
    console.error("Error deleting proxy:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to delete proxy" }, { status: 500 });
  }
}

// PUT: Edit an existing proxy rule + Update Cloudflare DNS
export async function PUT(req: Request) {
  const user = await verifyAuth();
  if (!user || String(user.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      filename, 
      serviceName, 
      domain, 
      oldDomain,
      targetIp, 
      targetPort,
      zoneId,
      subdomain,
      rootDomain,
      dnsIp,
      proxied 
    } = body;

    let fullDomain = domain;
    if (!fullDomain && rootDomain && subdomain) {
      fullDomain = subdomain === '@' ? rootDomain : `${subdomain}.${rootDomain}`;
    }

    if (!filename || !serviceName || !fullDomain || !targetIp || !targetPort) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const safeServiceName = serviceName.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    
    if (safeFilename !== `${safeServiceName}.yml` && safeFilename !== `${safeServiceName}.yaml`) {
        return NextResponse.json({ success: false, error: "Service name mismatch with filename" }, { status: 400 });
    }

    const filePath = path.join(RULES_DIR, 'http', safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: "Rule file not found" }, { status: 404 });
    }

    // Generate Traefik YAML for the updated rule
    const newProxyConfig = {
      http: {
        routers: {
          [safeServiceName]: {
            rule: `Host(\`${fullDomain}\`)`,
            entryPoints: ["websecure"],
            tls: {
              certResolver: "cloudflare"
            },
            service: `${safeServiceName}-svc`
          }
        },
        services: {
          [`${safeServiceName}-svc`]: {
            loadBalancer: {
              servers: [
                { url: `http://${targetIp}:${targetPort}` }
              ]
            }
          }
        }
      }
    };

    const yamlStr = yaml.stringify(newProxyConfig);
    // Write dynamically - Traefik watches this directory and updates without downtime!
    fs.writeFileSync(filePath, yamlStr, 'utf8');
    console.log(`[Traefik] Rule file updated dynamically: ${safeFilename}`);

    // ============================================================
    // CLOUDFLARE DNS SYNC LOGIC
    // ============================================================
    let dnsResult: any = null;
    const auth = await getCfAuthHeaders();

    if (auth && dnsIp) {
      let activeDnsIp = dnsIp;

      // If the IP is masked (e.g., 104.*.*.24), we need to fetch the real IP from Cloudflare
      if (activeDnsIp.includes('*')) {
        const searchDomain = oldDomain || fullDomain;
        const targetZoneId = zoneId || (await findZoneForDomain(searchDomain, auth.headers))?.zoneId;
        
        if (targetZoneId) {
          try {
            const listRes = await fetch(
              `https://api.cloudflare.com/client/v4/zones/${targetZoneId}/dns_records?name=${searchDomain}&type=A`,
              { headers: auth.headers, cache: 'no-store' }
            );
            const listData = await listRes.json();
            if (listData.success && listData.result && listData.result.length > 0) {
              activeDnsIp = listData.result[0].content;
              console.log(`[Cloudflare] Resolved masked IP ${dnsIp} to ${activeDnsIp}`);
            }
          } catch (e) {
            console.error("[Cloudflare] Error resolving masked IP:", e);
          }
        }
      }

      const domainChanged = oldDomain && oldDomain !== fullDomain;

      if (domainChanged) {
        // CASE 1: Domain changed (e.g., subdomain or root domain changed)
        // → Delete old DNS record, then create new one
        console.log(`[Cloudflare] Domain changed: ${oldDomain} → ${fullDomain}`);

        // Delete old DNS record
        const deleteResult = await deleteCloudflareDNSRecord(oldDomain);
        if (deleteResult.success) {
          console.log(`[Cloudflare] Old DNS record for ${oldDomain} deleted`);
        } else {
          console.warn(`[Cloudflare] Could not delete old DNS for ${oldDomain}: ${deleteResult.error}`);
        }

        // Create new DNS record
        if (zoneId) {
          dnsResult = await addCloudflareDNSRecord(
            zoneId, 
            subdomain || fullDomain.replace(`.${rootDomain}`, ''), 
            rootDomain || '', 
            activeDnsIp, 
            proxied ?? false
          );
          if (dnsResult.success) {
            dnsResult.action = "replaced";
            console.log(`[Cloudflare] New DNS record created for ${fullDomain}`);
          }
        } else {
          // No zoneId provided, try auto-detect
          const zoneInfo = await findZoneForDomain(fullDomain, auth.headers);
          if (zoneInfo) {
            const sub = fullDomain === zoneInfo.zoneName ? '@' : fullDomain.replace(`.${zoneInfo.zoneName}`, '');
            dnsResult = await addCloudflareDNSRecord(zoneInfo.zoneId, sub, zoneInfo.zoneName, activeDnsIp, proxied ?? false);
            if (dnsResult.success) dnsResult.action = "replaced";
          } else {
            dnsResult = { success: false, error: "Could not find zone for new domain" };
          }
        }
      } else {
        // CASE 2: Same domain, but IP or proxied status might have changed
        // → Find existing record and update it
        const targetZoneId = zoneId || (await findZoneForDomain(fullDomain, auth.headers))?.zoneId;

        if (targetZoneId) {
          const listRes = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${targetZoneId}/dns_records?name=${fullDomain}&type=A`,
            { headers: auth.headers, cache: 'no-store' }
          );
          const listData = await listRes.json();

          if (listData.success && listData.result && listData.result.length > 0) {
            const recordId = listData.result[0].id;
            const updateRes = await fetch(
              `https://api.cloudflare.com/client/v4/zones/${targetZoneId}/dns_records/${recordId}`,
              {
                method: "PUT",
                headers: auth.headers,
                body: JSON.stringify({
                  type: "A",
                  name: fullDomain,
                  content: activeDnsIp,
                  ttl: 1,
                  proxied: proxied ?? false
                })
              }
            );
            const updateData = await updateRes.json();
            if (updateData.success) {
              dnsResult = { success: true, action: "updated" };
              console.log(`[Cloudflare] DNS record updated: ${fullDomain} → ${activeDnsIp}`);
            } else {
              console.error(`[Cloudflare] Failed to update DNS: ${JSON.stringify(updateData.errors)}`);
              dnsResult = { success: false, error: updateData.errors?.[0]?.message || "Failed to update DNS" };
            }
          } else {
            // Record not found, create new
            const sub = subdomain || (rootDomain ? fullDomain.replace(`.${rootDomain}`, '') : fullDomain);
            dnsResult = await addCloudflareDNSRecord(targetZoneId, sub, rootDomain || '', activeDnsIp, proxied ?? false);
            if (dnsResult.success) dnsResult.action = "created";
          }
        } else {
          console.warn(`[Cloudflare] No zone found for ${fullDomain}, skipping DNS update`);
          dnsResult = { success: false, error: "No zone found for this domain" };
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Proxy updated successfully! Traefik will apply the changes dynamically.", 
      dns: dnsResult 
    });
  } catch (error: any) {
    console.error("Error updating proxy:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to update proxy" }, { status: 500 });
  }
}

// PATCH: Toggle proxy status (Start/Stop) by renaming to .disabled
export async function PATCH(req: Request) {
  const user = await verifyAuth();
  if (!user || String(user.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    const action = searchParams.get('action'); // 'start' or 'stop'

    if (!filename || !action) {
      return NextResponse.json({ success: false, error: "Filename and action are required" }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(RULES_DIR, 'http', safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: "Rule file not found" }, { status: 404 });
    }

    let newFilename = safeFilename;

    if (action === 'stop' && !safeFilename.endsWith('.disabled')) {
      newFilename = `${safeFilename}.disabled`;
    } else if (action === 'start' && safeFilename.endsWith('.disabled')) {
      newFilename = safeFilename.replace('.disabled', '');
    } else {
      return NextResponse.json({ success: true, message: "No action needed", filename: newFilename, status: action === 'stop' ? 'stopped' : 'active' });
    }

    const newFilePath = path.join(RULES_DIR, 'http', newFilename);
    fs.renameSync(filePath, newFilePath);

    console.log(`[Traefik] Proxy ${action === 'stop' ? 'disabled' : 'enabled'}: ${newFilename}`);

    return NextResponse.json({ 
      success: true, 
      message: `Proxy ${action === 'stop' ? 'stopped' : 'started'} successfully`,
      filename: newFilename,
      status: action === 'stop' ? 'stopped' : 'active'
    });
  } catch (error: any) {
    console.error("Error toggling proxy status:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to toggle status" }, { status: 500 });
  }
}

