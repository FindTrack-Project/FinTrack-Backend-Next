// src/api/app/incomes/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { amount, date, description, userId, source } = await req.json();

    // 1. Validasi Input
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }
    if (!date || !userId || !source) {
      return NextResponse.json(
        { message: "Missing required fields: date, userId, source" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format" },
        { status: 400 }
      );
    }

    // 2. Cek apakah user ada dan dapatkan saldo saat ini
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentBalance: true }, // Hanya ambil balance
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // 3. Buat entri pemasukan baru
    const newIncome = await prisma.income.create({
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        userId: userId,
        source: source,
      },
    });

    // 4. Perbarui currentBalance pengguna (TAMBAH SALDO)
    const updatedBalance = user.currentBalance + amount;

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentBalance: updatedBalance,
      },
    });

    return NextResponse.json(
      {
        message: "Income added successfully and balance updated",
        income: newIncome,
        newBalance: updatedBalance,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error adding income or updating balance:", error);
    return NextResponse.json(
      {
        message: "Failed to add income or update balance",
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

// Opsional: GET semua pemasukan untuk user tertentu
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    const incomes = await prisma.income.findMany({
      where: { userId: userId },
      orderBy: { date: "desc" }, // Urutkan berdasarkan tanggal terbaru
    });

    return NextResponse.json({ incomes }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching incomes:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch incomes",
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
