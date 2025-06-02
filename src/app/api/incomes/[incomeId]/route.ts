// src/api/app/incomes/[incomeId]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

// --- METHOD: PUT (Update Income) ---
export async function PUT(
  req: Request,
  { params }: { params: { incomeId: string } }
) {
  // 1. Verifikasi Token & Dapatkan userId
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
    // PERBAIKAN: Await params seperti yang disarankan Next.js
    const awaitedParams = await params;
    const { incomeId } = awaitedParams; // Destructure dari hasil await

    const { amount, date, description, source } = await req.json();

    // 2. Validasi Input
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
    }

    // 3. Cari Income yang akan diupdate & Verifikasi Kepemilikan
    const existingIncome = await prisma.income.findUnique({
      where: { id: incomeId },
    });

    if (!existingIncome) {
      return NextResponse.json(
        { message: "Income not found." },
        { status: 404 }
      );
    }
    // Otorisasi: Pastikan income ini milik user yang terotentikasi
    if (existingIncome.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this income." },
        { status: 403 }
      );
    }

    // 4. Perbarui currentBalance Pengguna
    const user = await prisma.user.findUnique({
      where: { id: userIdFromToken },
      select: { currentBalance: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const oldAmount = existingIncome.amount;
    const amountDifference = amount - oldAmount;
    const updatedBalance = user.currentBalance + amountDifference;

    await prisma.user.update({
      where: { id: userIdFromToken },
      data: { currentBalance: updatedBalance },
    });

    // 5. Perbarui Income
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
        message: "Income updated successfully and balance adjusted.",
        income: updatedIncome,
        newBalance: updatedBalance,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating income:", error);
    return NextResponse.json(
      {
        message: "Failed to update income.",
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

// --- METHOD: DELETE (Delete Income) ---
export async function DELETE(
  req: Request,
  { params }: { params: { incomeId: string } }
) {
  // 1. Verifikasi Token & Dapatkan userId
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
    // PERBAIKAN: Await params seperti yang disarankan Next.js
    const awaitedParams = await params;
    const { incomeId } = awaitedParams; // Destructure dari hasil await

    // 2. Validasi Input
    if (!incomeId) {
      return NextResponse.json(
        { message: "Income ID is required." },
        { status: 400 }
      );
    }

    // 3. Cari Income yang akan dihapus & Verifikasi Kepemilikan
    const existingIncome = await prisma.income.findUnique({
      where: { id: incomeId },
    });

    if (!existingIncome) {
      return NextResponse.json(
        { message: "Income not found." },
        { status: 404 }
      );
    }
    // Otorisasi: Pastikan income ini milik user yang terotentikasi
    if (existingIncome.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this income." },
        { status: 403 }
      );
    }

    // 4. Hapus Income
    await prisma.income.delete({
      where: { id: incomeId },
    });

    // 5. Perbarui currentBalance Pengguna
    const user = await prisma.user.findUnique({
      where: { id: userIdFromToken },
      select: { currentBalance: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const amountToDeduct = existingIncome.amount;
    const updatedBalance = user.currentBalance - amountToDeduct;

    await prisma.user.update({
      where: { id: userIdFromToken },
      data: { currentBalance: updatedBalance },
    });

    return NextResponse.json(
      {
        message: "Income deleted successfully and balance adjusted.",
        newBalance: updatedBalance,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error deleting income:", error);
    return NextResponse.json(
      {
        message: "Failed to delete income.",
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
