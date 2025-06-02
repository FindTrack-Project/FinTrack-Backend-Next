// src/api/app/expenses/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1]; // Expecting "Bearer <token>"
  if (!token) {
    return NextResponse.json(
      { message: "Missing or invalid authorization token." },
      { status: 401 }
    );
  }
  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    return NextResponse.json(
      { message: "Invalid or expired token." },
      { status: 401 }
    );
  }
  const userId = payload.userId;

  try {
    const { amount, date, description, category } = await req.json();

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentBalance: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    // --- VALIDASI BARU: Cek Saldo Tidak Cukup ---
    if (user.currentBalance < amount) {
      return NextResponse.json(
        {
          message: "Insufficient balance. Cannot perform this expense.",
          currentBalance: user.currentBalance,
          expenseAmount: amount,
        },
        { status: 400 }
      ); // Atau 402 Payment Required jika ingin lebih spesifik
    }
    // --- AKHIR VALIDASI BARU ---

    const newExpense = await prisma.expense.create({
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        userId: userId,
        category: category,
      },
    });

    const updatedBalance = user.currentBalance - amount;

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentBalance: updatedBalance,
      },
    });

    return NextResponse.json(
      {
        message: "Expense added successfully and balance updated.",
        expense: newExpense,
        newBalance: updatedBalance,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error adding expense or updating balance:", error);
    return NextResponse.json(
      {
        message: "Failed to add expense or update balance.",
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

// Opsional: GET semua pengeluaran untuk user tertentu
export async function GET(req: Request) {
  // 1. Verifikasi Token
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1]; // Expecting "Bearer <token>"
  if (!token) {
    return NextResponse.json(
      { message: "Missing or invalid authorization token." },
      { status: 401 }
    );
  }
  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    return NextResponse.json(
      { message: "Invalid or expired token." },
      { status: 401 }
    );
  }
  const userId = payload.userId; // Dapatkan userId dari token!

  try {
    // Hapus pengambilan userId dari query params
    // const { searchParams } = new URL(req.url);
    // const userId = searchParams.get("userId");

    // Hapus validasi ini karena userId selalu ada dari token yang valid
    // if (!userId) { // <--- BLOK INI DIHAPUS
    //   return NextResponse.json(
    //     { message: "User ID is required" },
    //     { status: 400 }
    //   );
    // }

    const expenses = await prisma.expense.findMany({
      where: { userId: userId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ expenses }, { status: 200 });
  } catch (error: unknown) {
    // Menggunakan 'unknown' untuk konsistensi penanganan error
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
