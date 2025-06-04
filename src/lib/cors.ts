// src/lib/cors.ts

import { NextResponse } from "next/server";

// Fungsi untuk menambahkan header CORS ke NextResponse
export function withCORS(
  response: NextResponse,
  methods: string[],
  headers: string[]
): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*"); // Ganti '*' dengan domain frontend Anda di produksi!
  response.headers.set("Access-Control-Allow-Methods", methods.join(", "));
  response.headers.set("Access-Control-Allow-Headers", headers.join(", "));
  return response;
}

// Fungsi untuk menangani OPTIONS (preflight) request
export function handleCORSPreflight(
  methods: string[],
  headers: string[]
): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set("Access-Control-Allow-Origin", "*"); // Ganti '*' dengan domain frontend Anda di produksi!
  response.headers.set("Access-Control-Allow-Methods", methods.join(", "));
  response.headers.set("Access-Control-Allow-Headers", headers.join(", "));
  response.headers.set("Access-Control-Max-Age", "86400"); // Cache preflight for 24 hours
  return response;
}
