// src/api/app/saving-goals/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import utilitas verifikasi JWT

const prisma = new PrismaClient();

// --- METHOD: POST (Buat Tujuan Tabungan Baru) ---
export async function POST(req: Request) {
  // 1. Verifikasi Token & Dapatkan userId
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Invalid or missing authentication token." },
      { status: 401 }
    );
  }
  const userId = authResult.userId; // Dapatkan userId dari token!

  try {
    const { name, targetAmount } = await req.json();

    // 2. Validasi Input
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        {
          message:
            "Saving goal name is required and must be a non-empty string.",
        },
        { status: 400 }
      );
    }
    if (
      typeof targetAmount !== "number" ||
      isNaN(targetAmount) ||
      targetAmount <= 0
    ) {
      return NextResponse.json(
        { message: "Target amount is required and must be a positive number." },
        { status: 400 }
      );
    }

    // Cek user existence (opsional, tapi baik untuk memastikan)
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { message: "User not found for this token." },
        { status: 404 }
      );
    }

    // 3. Buat Tujuan Tabungan Baru
    const newSavingGoal = await prisma.savingGoal.create({
      data: {
        userId: userId,
        name: name.trim(),
        targetAmount: targetAmount,
        currentSavedAmount: 0,
        isCompleted: false,
      },
      select: {
        // Hanya kembalikan data yang relevan
        id: true,
        name: true,
        targetAmount: true,
        currentSavedAmount: true,
        isCompleted: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Saving goal created successfully.",
        savingGoal: newSavingGoal,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating saving goal:", error);
    return NextResponse.json(
      {
        message: "Failed to create saving goal.",
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

// --- METHOD: GET (Lihat Semua Tujuan Tabungan Pengguna) ---
export async function GET(req: Request) {
  // 1. Verifikasi Token & Dapatkan userId
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Invalid or missing authentication token." },
      { status: 401 }
    );
  }
  const userId = authResult.userId; // Dapatkan userId dari token!

  try {
    // Cek user existence (opsional)
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { message: "User not found for this token." },
        { status: 404 }
      );
    }

    // 2. Ambil semua tujuan tabungan milik pengguna
    const savingGoals = await prisma.savingGoal.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "asc" }, // Urutkan berdasarkan tanggal dibuat
    });

    return NextResponse.json({ savingGoals }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching saving goals:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch saving goals.",
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
