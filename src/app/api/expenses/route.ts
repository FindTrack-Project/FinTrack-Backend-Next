// src/api/app/expenses/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

// --- METHOD: POST (Tambah Pengeluaran) ---
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = authResult.userId;

  try {
    const { amount, date, description, category, accountId } = await req.json(); // TAMBAH: accountId

    // 1. Validasi Input
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }
    if (!date || !category || !accountId) {
      // TAMBAH: accountId diperlukan
      return NextResponse.json(
        { message: "Missing required fields: date, category, accountId." },
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

    // 3. Validasi Saldo Akun Tidak Cukup
    if (account.currentBalance < amount) {
      return NextResponse.json(
        {
          message:
            "Insufficient balance in selected account. Cannot perform this expense.",
          accountBalance: account.currentBalance,
          expenseAmount: amount,
        },
        { status: 400 }
      );
    }

    // 4. Buat entri pengeluaran baru
    const newExpense = await prisma.expense.create({
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        userId: userId,
        accountId: accountId, // Gunakan accountId
        category: category,
      },
    });

    // 5. Perbarui currentBalance AKUN (KURANGI SALDO)
    const updatedAccountBalance = account.currentBalance - amount;

    await prisma.account.update({
      where: { id: accountId },
      data: {
        currentBalance: updatedAccountBalance,
      },
    });

    return NextResponse.json(
      {
        message: "Expense added successfully and account balance updated.",
        expense: newExpense,
        newAccountBalance: updatedAccountBalance, // Kembalikan saldo akun yang baru
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error adding expense or updating account balance:", error);
    return NextResponse.json(
      {
        message: "Failed to add expense or update account balance.",
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
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = authResult.userId;

  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: userId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ expenses }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch expenses",
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
