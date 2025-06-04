// src/api/app/incomes/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

// --- METHOD: POST (Tambah Pemasukan) ---
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || "";
  const authResult = verifyToken(token);
  if (!authResult || !("userId" in authResult)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = authResult.userId;

  try {
    const { amount, date, description, source, accountId } = await req.json(); // TAMBAH: accountId

    // 1. Validasi Input
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }
    if (!date || !source || !accountId) {
      // TAMBAH: accountId diperlukan
      return NextResponse.json(
        { message: "Missing required fields: date, source, accountId." },
        { status: 400 }
      );
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format." },
        { status: 400 }
      );
    }

    // 2. Cek apakah user ada dan dapatkan akun yang relevan
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, userId: true, currentBalance: true }, // Ambil balance akun
    });

    if (!account) {
      return NextResponse.json(
        { message: "Account not found." },
        { status: 404 }
      );
    }
    // Otorisasi: Pastikan akun ini milik user yang terotentikasi
    if (account.userId !== userId) {
      return NextResponse.json(
        { message: "Unauthorized: Account does not belong to you." },
        { status: 403 }
      );
    }

    // 3. Buat entri pemasukan baru
    const newIncome = await prisma.income.create({
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        userId: userId,
        accountId: accountId, // Gunakan accountId
        source: source,
      },
    });

    // 4. Perbarui currentBalance AKUN (TAMBAH SALDO)
    const updatedAccountBalance = account.currentBalance + amount;

    await prisma.account.update({
      where: { id: account.id },
      data: {
        currentBalance: updatedAccountBalance,
      },
    });

    return NextResponse.json(
      {
        message: "Income added successfully and account balance updated.",
        income: newIncome,
        newAccountBalance: updatedAccountBalance, // Kembalikan saldo akun yang baru
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error adding income or updating account balance:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      {
        message: "Failed to add income or update account balance.",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// --- METHOD: GET (Lihat Semua Pemasukan) ---
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || "";
  const authResult = verifyToken(token);
  if (!authResult || !("userId" in authResult)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = authResult.userId;

  try {
    const incomes = await prisma.income.findMany({
      where: { userId: userId },
    });

    return NextResponse.json(
      {
        message: "Incomes fetched successfully.",
        incomes: incomes,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching incomes:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      {
        message: "Failed to fetch incomes",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
