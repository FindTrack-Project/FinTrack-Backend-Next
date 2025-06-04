// src/api/app/users/balance/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  // 1. Verifikasi Token & Dapatkan userId
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1]; // Expecting "Bearer <token>"
  const authResult = verifyToken(token || "");
  if (!authResult) {
    return NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401 }
    );
  }
  const userId = authResult.userId; // Dapatkan userId dari token!

  try {
    if (!userId) {
      // Ini seharusnya tidak terjadi jika verifyToken sukses, tapi sebagai fallback
      return NextResponse.json(
        { message: "User ID not found in token." },
        { status: 400 }
      );
    }

    // 2. Ambil semua akun milik pengguna
    const accounts = await prisma.account.findMany({
      where: { userId: userId },
      select: { currentBalance: true }, // Hanya perlu saldo dari setiap akun
    });

    // 3. Jika tidak ada akun, kembalikan 0 dan pesan informatif
    if (accounts.length === 0) {
      return NextResponse.json(
        { currentBalance: 0, message: "No accounts found for this user." },
        { status: 200 }
      );
    }

    // 4. Hitung total saldo dari semua akun
    const totalBalance = accounts.reduce(
      (sum, account) => sum + account.currentBalance,
      0
    );

    return NextResponse.json({ currentBalance: totalBalance }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching user balance:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch user balance.",
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
