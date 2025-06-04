// src/api/app/users/[userId]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userIdFromToken = payload.userId;

  try {
    const awaitedParams = await params;
    const { userId } = awaitedParams;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required." },
        { status: 400 }
      );
    }

    // Otorisasi: Pastikan userId dari URL cocok dengan userId dari token
    if (userId !== userIdFromToken) {
      return NextResponse.json(
        {
          message:
            "Unauthorized access: Token does not match requested user ID",
        },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        // PERBAIKAN: Hapus baris 'currentBalance: true' dari sini
        // currentBalance: true, // BARIS INI DIHAPUS
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching user details:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch user details.",
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
