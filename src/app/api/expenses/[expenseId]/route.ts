// src/api/app/expenses/[expenseId]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

// --- METHOD: PUT (Update Expense) ---
export async function PUT(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json(
      { message: "Unauthorized: Invalid or missing token." },
      { status: 401 }
    );
  }
  const userIdFromToken = payload.userId;

  try {
    const awaitedParams = await params;
    const { expenseId } = awaitedParams;

    const { amount, date, description, category } = await req.json(); // accountId TIDAK diizinkan diubah melalui PUT ini untuk menjaga konsistensi

    if (!expenseId) {
      return NextResponse.json(
        { message: "Expense ID is required." },
        { status: 400 }
      );
    }
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }
    if (!date || !category) {
      return NextResponse.json(
        { message: "Missing required fields: date, category." },
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

    // 1. Cari Expense yang akan diupdate & Verifikasi Kepemilikan & Dapatkan accountId-nya
    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, userId: true, amount: true, accountId: true }, // Ambil accountId dan amount lama
    });

    if (!existingExpense) {
      return NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
    }
    if (existingExpense.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this expense." },
        { status: 403 }
      );
    }

    // 2. Dapatkan Akun yang Terkait
    const account = await prisma.account.findUnique({
      where: { id: existingExpense.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      // Ini seharusnya tidak terjadi jika data konsisten, tapi baik untuk validasi
      return NextResponse.json(
        { message: "Associated account not found." },
        { status: 404 }
      );
    }

    // 3. Validasi Saldo Akun Tidak Cukup untuk Update
    const oldAmount = existingExpense.amount;
    const amountDifference = amount - oldAmount; // Selisih baru - lama

    if (amountDifference > 0 && account.currentBalance - amountDifference < 0) {
      return NextResponse.json(
        {
          message:
            "Insufficient balance in account to increase expense amount.",
          accountBalance: account.currentBalance,
          increaseAmount: amountDifference,
        },
        { status: 400 }
      );
    }

    // 4. Perbarui currentBalance AKUN
    const updatedAccountBalance = account.currentBalance - amountDifference;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    // 5. Perbarui Expense
    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        category: category,
      },
    });

    return NextResponse.json(
      {
        message: "Expense updated successfully and account balance adjusted.",
        expense: updatedExpense,
        newAccountBalance: updatedAccountBalance,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      {
        message: "Failed to update expense.",
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

// --- METHOD: DELETE (Delete Expense) ---
export async function DELETE(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json(
      { message: "Unauthorized: Invalid or missing token." },
      { status: 401 }
    );
  }
  const userIdFromToken = payload.userId;

  try {
    const awaitedParams = await params;
    const { expenseId } = awaitedParams;

    if (!expenseId) {
      return NextResponse.json(
        { message: "Expense ID is required." },
        { status: 400 }
      );
    }

    // 1. Cari Expense yang akan dihapus & Verifikasi Kepemilikan & Dapatkan accountId-nya
    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, userId: true, amount: true, accountId: true }, // Ambil accountId dan amount
    });

    if (!existingExpense) {
      return NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
    }
    if (existingExpense.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this expense." },
        { status: 403 }
      );
    }

    // 2. Dapatkan Akun yang Terkait
    const account = await prisma.account.findUnique({
      where: { id: existingExpense.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      return NextResponse.json(
        { message: "Associated account not found." },
        { status: 404 }
      );
    }

    // 3. Hapus Expense
    await prisma.expense.delete({
      where: { id: expenseId },
    });

    // 4. Perbarui currentBalance AKUN (TAMBAH kembali amount yang dihapus)
    const amountToRestore = existingExpense.amount;
    const updatedAccountBalance = account.currentBalance + amountToRestore;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    return NextResponse.json(
      {
        message: "Expense deleted successfully and account balance adjusted.",
        newAccountBalance: updatedAccountBalance,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      {
        message: "Failed to delete expense.",
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
