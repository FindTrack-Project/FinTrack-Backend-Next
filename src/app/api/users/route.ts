// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/users - Membuat user baru
export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { message: "Password is required" },
        { status: 400 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    // Di lingkungan produksi, berikan pesan error yang lebih umum
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to create user", error: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/users - Mendapatkan semua user
export async function GET() {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json(users, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to fetch users", error: errorMessage },
      { status: 500 }
    );
  }
}
