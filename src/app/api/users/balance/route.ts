// src/api/app/users/balance/route.ts (Lokasi BARU, tanpa [userId] di nama folder)

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import utilitas verifikasi JWT

const prisma = new PrismaClient();

export async function GET(req: Request) {
  // Tidak ada { params } lagi
  // Verifikasi Token
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  const authResult = token ? verifyToken(token) : null;
  if (!authResult || !authResult.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = authResult.userId; // Dapatkan userId dari token!

  try {
    // userId sekarang diambil dari token, bukan dari URL params
    if (!userId) {
      // Ini seharusnya tidak terjadi jika verifyToken sukses
      return NextResponse.json(
        { message: "User ID not found in token" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }, // Gunakan userId dari token
      select: {
        currentBalance: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { currentBalance: user.currentBalance },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching user balance:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch user balance",
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
