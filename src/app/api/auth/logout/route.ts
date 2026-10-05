import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logout berhasil" });
  
  // Hapus cookie sesi untuk logout
  response.cookies.delete("proxypanel_session");
  
  return response;
}
