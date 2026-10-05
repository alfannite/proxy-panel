import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Konfigurasi Keamanan Panel
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';
const ENTRANCE_PATH = process.env.ENTRANCE_PATH || 'masukpanel';

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get('proxypanel_session')?.value;
  const pathname = request.nextUrl.pathname;

  const isApiRoute = pathname.startsWith('/api/');
  const isEntranceRoute = pathname === `/${ENTRANCE_PATH}`;
  const isDirectLoginRoute = pathname === '/login';
  
  // 1. Validasi Token JWT Anti-Palsu
  let isValidUser = false;
  if (token) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(token, secret);
      isValidUser = true;
    } catch (e: any) {
      console.log("JWT Error:", e.message);
      isValidUser = false;
    }
  } else {
    console.log("Token cookie tidak ditemukan");
  }

  // 2. Logic Entrance Keamanan (Honeypot Scanner Trap)
  if (!isValidUser) {
    if (!isEntranceRoute && !pathname.startsWith('/api/auth/')) {
       // KASIH HALAMAN SUPER ANEH (HONEYPOT)
       // Scanner (kayak DirBuster/Nikto) bakal pusing karena statusnya 200 OK tapi isinya sampah unicode
       const bizarreContent = `
         <!DOCTYPE html>
         <html>
         <head><title>Ø·Ø±ÙŠÙ‚</title></head>
         <body style="background: black; color: red; font-family: monospace;">
           <pre>
           0xDEADBEEF 
           §§§§§§§§§§§§§§§§§§§§§§§§§
           CONNECTION_TERMINATED_BY_SYSTEM_OVERRIDE
           [ERR_MEM_LEAK] â–“â–“â–“â–“â–“â–“â–“â–“â–“â–“â–“â–“
           ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½
           </pre>
         </body>
         </html>
       `;
       
       return new NextResponse(bizarreContent, { 
         status: 200, // Sengaja 200 biar bot ngira nemu halaman asli
         headers: {
           'Content-Type': 'text/html; charset=utf-8',
           'Server': 'Apache/1.3.37 (Unix)', // Nge-prank bot seolah ini server jadul
           'X-Powered-By': 'PHP/4.1.2'
         } 
       });
    }
    
    // Kalau lewat pintu rahasia yang benar: Rewrite ke /login
    if (isEntranceRoute) {
       return NextResponse.rewrite(new URL('/login', request.url));
    }
  }

  // 3. Kalau udah berhasil Login
  if (isValidUser) {
     if (isEntranceRoute || isDirectLoginRoute) {
         return NextResponse.redirect(new URL('/', request.url));
     }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

