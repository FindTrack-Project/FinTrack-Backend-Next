// src/api/auth/login/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";
import { withCORS, handleCORSPreflight } from "@/lib/cors";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      const response = NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]); // Gunakan helper
    }

    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      const response = NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]); // Gunakan helper
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      const response = NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]); // Gunakan helper
    }

    const token = generateToken(user.id);

    const response = NextResponse.json(
      {
        message: "Login successful",
        token: token,
        userId: user.id,
        name: user.name,
      },
      { status: 200 }
    );

    return withCORS(response, ["POST"], ["Content-Type", "Authorization"]); // Gunakan helper
  } catch (error: unknown) {
    console.error("Error during login:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to login",
        error: errorMessage,
      },
      { status: 500 }
    );
    return withCORS(errorResponse, ["POST"], ["Content-Type", "Authorization"]); // Gunakan helper
  } finally {
    await prisma.$disconnect();
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return handleCORSPreflight(["POST"], ["Content-Type", "Authorization"]); // Gunakan helper
}
