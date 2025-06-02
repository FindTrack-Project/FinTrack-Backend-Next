import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

// --- METHOD: PUT
export async function PUT(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return NextResponse.json(
      { message: "No token provided." },
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
    const { expenseId } = awaitedParams;

    const { amount, date, description, category } = await req.json();

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

    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
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

    const user = await prisma.user.findUnique({
      where: { id: userIdFromToken },
      select: { currentBalance: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const oldAmount = existingExpense.amount;
    const amountDifference = amount - oldAmount; // Selisih baru - lama

    // --- VALIDASI BARU: Cek Saldo Tidak Cukup untuk Update ---
    // Jika amountDifference positif (jumlah pengeluaran bertambah), cek apakah saldo mencukupi
    if (amountDifference > 0 && user.currentBalance - amountDifference < 0) {
      return NextResponse.json(
        {
          message: "Insufficient balance to increase expense amount.",
          currentBalance: user.currentBalance,
          increaseAmount: amountDifference,
        },
        { status: 400 }
      );
    }
    // --- AKHIR VALIDASI BARU ---

    const updatedBalance = user.currentBalance - amountDifference;

    await prisma.user.update({
      where: { id: userIdFromToken },
      data: { currentBalance: updatedBalance },
    });

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
        message: "Expense updated successfully and balance adjusted.",
        expense: updatedExpense,
        newBalance: updatedBalance,
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
  // 1. Verifikasi Token & Dapatkan userId
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return NextResponse.json(
      { message: "No token provided." },
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
    // PERBAIKAN: Await params seperti yang disarankan Next.js
    const awaitedParams = await params;
    const { expenseId } = awaitedParams; // Destructure dari hasil await

    // 2. Validasi Input
    if (!expenseId) {
      return NextResponse.json(
        { message: "Expense ID is required." },
        { status: 400 }
      );
    }

    // 3. Cari Expense yang akan dihapus & Verifikasi Kepemilikan
    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
    }
    // Otorisasi: Pastikan expense ini milik user yang terotentikasi
    if (existingExpense.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this expense." },
        { status: 403 }
      );
    }

    // 4. Hapus Expense
    await prisma.expense.delete({
      where: { id: expenseId },
    });

    // 5. Perbarui currentBalance Pengguna
    const user = await prisma.user.findUnique({
      where: { id: userIdFromToken },
      select: { currentBalance: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const amountToRestore = existingExpense.amount;
    const updatedBalance = user.currentBalance + amountToRestore;

    await prisma.user.update({
      where: { id: userIdFromToken },
      data: { currentBalance: updatedBalance },
    });

    return NextResponse.json(
      {
        message: "Expense deleted successfully and balance adjusted.",
        newBalance: updatedBalance,
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
