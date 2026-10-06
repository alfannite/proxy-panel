import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://traefik-core:8080/metrics', { next: { revalidate: 0 } });
    if (!res.ok) {
      return NextResponse.json({ requests: 0 }, { status: 500 });
    }
    const text = await res.text();
    let totalRequests = 0;
    
    // Parse traefik_entrypoint_requests_total lines
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('traefik_entrypoint_requests_total{')) {
        const parts = line.split(' ');
        if (parts.length === 2) {
          totalRequests += parseInt(parts[1], 10);
        }
      }
    }

    return NextResponse.json({ requests: totalRequests });
  } catch (error) {
    console.error('Error fetching Traefik metrics:', error);
    return NextResponse.json({ requests: 0 }, { status: 500 });
  }
}
