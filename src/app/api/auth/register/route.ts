// src/api/auth/register/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// --- CORS Headers Configuration ---
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // Allow all origins, adjust as needed for production (e.g., specific domains)
  "Access-Control-Allow-Methods": "POST, OPTIONS", // Allowed methods for this route
  "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
};

// --- METHOD: OPTIONS (For CORS Preflight Requests) ---
export async function OPTIONS() {
  // Respond to CORS preflight requests
  return NextResponse.json({}, { headers: CORS_HEADERS, status: 200 });
}

export async function POST(req: Request) {
  try {
    const { email, name, password, initialBalance } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400, headers: CORS_HEADERS } // Apply CORS headers
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409, headers: CORS_HEADERS } // Apply CORS headers
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email,
        name: name || null,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    const parsedInitialBalance =
      typeof initialBalance === "number" && !isNaN(initialBalance)
        ? initialBalance
        : 0;

    await prisma.account.create({
      data: {
        userId: newUser.id,
        name: "Main Account",
        currentBalance: parsedInitialBalance,
        type: "General",
      },
    });

    return NextResponse.json(
      {
        message: "User registered successfully and default account created.",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      },
      { status: 201, headers: CORS_HEADERS } // Apply CORS headers
    );
  } catch (error) {
    console.error("Error during user registration:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      {
        message: "Failed to register user",
        error: errorMessage,
      },
      { status: 500, headers: CORS_HEADERS } // Apply CORS headers
    );
  } finally {
    await prisma.$disconnect();
  }
}
