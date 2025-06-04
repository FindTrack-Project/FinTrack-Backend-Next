// src/api/app/incomes/[incomeId]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Pastikan ini adalah utilitas verifyToken yang benar

const prisma = new PrismaClient();

// --- METHOD: PUT (Update Income) ---
export async function PUT(
  req: Request,
  { params }: { params: { incomeId: string } }
) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten)
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1]; // Expecting "Bearer <token>"
  if (!token) {
    return NextResponse.json(
      { message: "Authorization token missing." },
      { status: 401 }
    );
  }
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Invalid or expired token." },
      { status: 401 }
    );
  }
  const userIdFromToken = authResult.userId;

  try {
    const awaitedParams = await params;
    const { incomeId } = awaitedParams;

    const { amount, date, description, source } = await req.json(); // 2. Validasi Input

    if (!incomeId) {
      return NextResponse.json(
        { message: "Income ID is required." },
        { status: 400 }
      );
    }
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }
    if (!date || !source) {
      return NextResponse.json(
        { message: "Missing required fields: date, source." },
        { status: 400 }
      );
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format." },
        { status: 400 }
      );
    } // 3. Cari Income yang akan diupdate & Verifikasi Kepemilikan & Dapatkan accountId-nya

    const existingIncome = await prisma.income.findUnique({
      where: { id: incomeId },
      select: { id: true, userId: true, amount: true, accountId: true }, // Ambil accountId dan amount lama
    });

    if (!existingIncome) {
      return NextResponse.json(
        { message: "Income not found." },
        { status: 404 }
      );
    } // Otorisasi: Pastikan income ini milik user yang terotentikasi
    if (existingIncome.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this income." },
        { status: 403 }
      );
    } // 4. Dapatkan Akun yang Terkait (untuk update saldo)

    const account = await prisma.account.findUnique({
      where: { id: existingIncome.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      return NextResponse.json(
        { message: "Associated account not found." },
        { status: 404 }
      );
    } // 5. Perbarui currentBalance AKUN (BUKAN USER)

    const oldAmount = existingIncome.amount;
    const amountDifference = amount - oldAmount; // Selisih baru - lama
    const updatedAccountBalance = account.currentBalance + amountDifference; // Tambahkan selisih ke saldo akun

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    }); // 6. Perbarui Income

    const updatedIncome = await prisma.income.update({
      where: { id: incomeId },
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        source: source,
      },
    });

    return NextResponse.json(
      {
        message: "Income updated successfully and account balance adjusted.",
        income: updatedIncome,
        newAccountBalance: updatedAccountBalance, // Kembalikan saldo akun yang baru
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    // Menggunakan 'unknown' untuk konsistensi penanganan error
    console.error("Error updating income:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      {
        message: "Failed to update income.",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// --- METHOD: DELETE (Delete Income) ---
export async function DELETE(
  req: Request,
  { params }: { params: { incomeId: string } }
) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten)
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1]; // Expecting "Bearer <token>"
  if (!token) {
    return NextResponse.json(
      { message: "Authorization token missing." },
      { status: 401 }
    );
  }
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Invalid or expired token." },
      { status: 401 }
    );
  }
  const userIdFromToken = authResult.userId;

  try {
    const awaitedParams = await params;
    const { incomeId } = awaitedParams; // 2. Validasi Input

    if (!incomeId) {
      return NextResponse.json(
        { message: "Income ID is required." },
        { status: 400 }
      );
    } // 3. Cari Income yang akan dihapus & Verifikasi Kepemilikan & Dapatkan accountId-nya

    const existingIncome = await prisma.income.findUnique({
      where: { id: incomeId },
      select: { id: true, userId: true, amount: true, accountId: true }, // Ambil accountId dan amount
    });

    if (!existingIncome) {
      return NextResponse.json(
        { message: "Income not found." },
        { status: 404 }
      );
    } // Otorisasi: Pastikan income ini milik user yang terotentikasi
    if (existingIncome.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this income." },
        { status: 403 }
      );
    } // 4. Dapatkan Akun yang Terkait (untuk update saldo)

    const account = await prisma.account.findUnique({
      where: { id: existingIncome.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      return NextResponse.json(
        { message: "Associated account not found." },
        { status: 404 }
      );
    } // 5. Hapus Income

    await prisma.income.delete({
      where: { id: incomeId },
    }); // 6. Perbarui currentBalance AKUN (KURANGI kembali amount yang dihapus)

    const amountToDeduct = existingIncome.amount;
    const updatedAccountBalance = account.currentBalance - amountToDeduct; // Kurangi jumlah yang dihapus dari saldo akun

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    return NextResponse.json(
      {
        message: "Income deleted successfully and account balance adjusted.",
        newAccountBalance: updatedAccountBalance,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    // Menggunakan 'unknown' untuk konsistensi penanganan error
    console.error("Error deleting income:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      {
        message: "Failed to delete income.",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
