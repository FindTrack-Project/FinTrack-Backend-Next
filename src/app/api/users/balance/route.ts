import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS, status: 200 });
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  const authResult = verifyToken(token || "");
  if (!authResult) {
    return NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId;

  try {
    if (!userId) {
      return NextResponse.json(
        { message: "User ID not found in token." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const accounts = await prisma.account.findMany({
      where: { userId: userId },
      select: { currentBalance: true },
    });

    if (accounts.length === 0) {
      return NextResponse.json(
        { currentBalance: 0, message: "No accounts found for this user." },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const totalBalance = accounts.reduce(
      (sum, account) => sum + account.currentBalance,
      0
    );

    return NextResponse.json(
      { currentBalance: totalBalance },
      { status: 200, headers: CORS_HEADERS }
    );
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
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
