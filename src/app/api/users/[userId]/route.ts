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

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userIdFromToken = payload.userId;

  try {
    const awaitedParams = await params;
    const { userId } = awaitedParams;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (userId !== userIdFromToken) {
      return NextResponse.json(
        {
          message:
            "Unauthorized access: Token does not match requested user ID",
        },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json({ user }, { status: 200, headers: CORS_HEADERS });
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
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
