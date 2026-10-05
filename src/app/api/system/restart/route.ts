import { NextResponse } from "next/server";
import http from "http";

export async function POST(): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const options = {
      socketPath: "/var/run/docker.sock",
      path: "/containers/traefik-core/restart",
      method: "POST",
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 204) {
        resolve(NextResponse.json({ success: true }));
      } else {
        res.on("data", (chunk) => {
          console.error("Docker restart error:", chunk.toString());
        });
        resolve(
          NextResponse.json(
            { success: false, error: `Docker returned status ${res.statusCode}` },
            { status: 500 }
          )
        );
      }
    });

    req.on("error", (err) => {
      console.error("Error communicating with Docker socket:", err);
      resolve(
        NextResponse.json(
          { success: false, error: "Failed to connect to Docker daemon. Ensure socket is mounted." },
          { status: 500 }
        )
      );
    });

    req.end();
  });
}
