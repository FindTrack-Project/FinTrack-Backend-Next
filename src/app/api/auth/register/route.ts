// src/api/auth/register/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, name, password, initialBalance } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email,
        name: name || null,
        password: hashedPassword,
        // currentBalance dihapus dari model User
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // TAMBAH: Buat akun default pertama untuk user baru
    const parsedInitialBalance =
      typeof initialBalance === "number" && !isNaN(initialBalance)
        ? initialBalance
        : 0;

    await prisma.account.create({
      data: {
        userId: newUser.id,
        name: "Main Account", // Atau "Cash", "Primary Wallet"
        currentBalance: parsedInitialBalance,
        type: "General", // Atau "Cash", "Bank", "E-Wallet"
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
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error during user registration:", error);
    return NextResponse.json(
      {
        message: "Failed to register user",
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
