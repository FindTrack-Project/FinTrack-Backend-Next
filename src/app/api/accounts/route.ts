// src/api/app/accounts/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import utilitas verifikasi JWT

const prisma = new PrismaClient();

// --- CORS Headers Configuration ---
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // Allow all origins, adjust as needed for production (e.g., specific domains)
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allowed methods
  "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
};

// --- METHOD: OPTIONS (For CORS Preflight Requests) ---
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS, status: 200 });
}

// --- METHOD: POST (Buat Akun Baru) ---
export async function POST(req: Request) {
  // 1. Verifikasi Token & Dapatkan userId
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId; // Dapatkan userId dari token!

  try {
    const { name, initialBalance, type } = await req.json();

    // 2. Validasi Input
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { message: "Account name is required and must be a non-empty string." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    // initialBalance bisa opsional dan default 0, tapi cek tipenya jika ada
    const parsedInitialBalance =
      typeof initialBalance === "number" && !isNaN(initialBalance)
        ? initialBalance
        : 0;

    // Cek user existence (opsional, tapi baik untuk memastikan)
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }, // Hanya perlu cek keberadaan
    });

    if (!userExists) {
      return NextResponse.json(
        { message: "User not found for this token." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // 3. Buat Akun Baru
    const newAccount = await prisma.account.create({
      data: {
        userId: userId,
        name: name.trim(),
        currentBalance: parsedInitialBalance, // Set saldo awal
        type: type || null, // Tipe akun (Bank, E-Wallet, Cash) bisa opsional
      },
      select: {
        // Hanya kembalikan data yang relevan
        id: true,
        name: true,
        currentBalance: true,
        type: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully.",
        account: newAccount,
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error creating account:", error);
    return NextResponse.json(
      {
        message: "Failed to create account.",
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// --- METHOD: GET (Lihat Semua Akun Pengguna) ---
export async function GET(req: Request) {
  // 1. Verifikasi Token & Dapatkan userId
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId; // Dapatkan userId dari token!

  try {
    // Cek user existence (opsional)
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { message: "User not found for this token." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // 2. Ambil semua akun milik pengguna
    const accounts = await prisma.account.findMany({
      where: { userId: userId },
      orderBy: { name: "asc" }, // Urutkan berdasarkan nama
    });

    return NextResponse.json(
      { accounts },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch accounts.",
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
