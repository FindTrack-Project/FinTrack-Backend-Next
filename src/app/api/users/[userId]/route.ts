// src/api/app/users/[userId]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { withCORS, handleCORSPreflight } from "@/lib/cors"; // Import helper CORS

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const payload = verifyToken(token);

  if (!payload) {
    const response = NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401 }
    );
    return withCORS(response, ["GET"], ["Content-Type", "Authorization"]);
  }
  const userIdFromToken = payload.userId;

  try {
    // Await params before destructuring
    const { userId } = await params;

    if (!userId) {
      const response = NextResponse.json(
        { message: "User ID is required." },
        { status: 400 }
      );
      return withCORS(response, ["GET"], ["Content-Type", "Authorization"]);
    }

    if (userId !== userIdFromToken) {
      const response = NextResponse.json(
        {
          message:
            "Unauthorized access: Token does not match requested user ID",
        },
        { status: 403 }
      );
      return withCORS(response, ["GET"], ["Content-Type", "Authorization"]);
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
      const response = NextResponse.json(
        { message: "User not found." },
        { status: 404 }
      );
      return withCORS(response, ["GET"], ["Content-Type", "Authorization"]);
    }

    const response = NextResponse.json({ user }, { status: 200 });
    return withCORS(response, ["GET"], ["Content-Type", "Authorization"]);
  } catch (error: unknown) {
    console.error("Error fetching user details:", error);
    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: string }).message
        : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to fetch user details.",
        error: errorMessage,
      },
      { status: 500 }
    );
    return withCORS(errorResponse, ["GET"], ["Content-Type", "Authorization"]);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return handleCORSPreflight(["GET"], ["Content-Type", "Authorization"]);
}
