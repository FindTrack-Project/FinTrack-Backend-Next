// src/api/app/expenses/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import utilitas verifikasi JWT

const prisma = new PrismaClient();

export async function POST(req: Request) {
  // Verifikasi Token
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1]; // Expecting "Bearer <token>"
  const authResult = token ? verifyToken(token) : null;
  if (!authResult || !authResult.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = authResult.userId; // Dapatkan userId dari token!

  try {
    const { amount, date, description, category } = await req.json(); // userId TIDAK perlu dari body lagi

    // 1. Validasi Input
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }
    if (!date || !category) {
      // userId sudah ada dari token
      return NextResponse.json(
        { message: "Missing required fields: date, category" },
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
      where: { id: userId }, // Gunakan userId dari token
      select: { currentBalance: true },
    });

    if (!user) {
      // Ini seharusnya jarang terjadi jika token valid, kecuali user dihapus setelah login
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // 3. Buat entri pengeluaran baru
    const newExpense = await prisma.expense.create({
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        userId: userId, // Gunakan userId dari token
        category: category,
      },
    });

    // 4. Perbarui currentBalance pengguna (KURANGI SALDO)
    const updatedBalance = user.currentBalance - amount;

    await prisma.user.update({
      where: { id: userId }, // Gunakan userId dari token
      data: {
        currentBalance: updatedBalance,
      },
    });

    return NextResponse.json(
      {
        message: "Expense added successfully and balance updated",
        expense: newExpense,
        newBalance: updatedBalance,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error adding expense or updating balance:", error);
    return NextResponse.json(
      {
        message: "Failed to add expense or update balance",
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

export async function GET(req: Request) {
  // Verifikasi Token
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1]; // Expecting "Bearer <token>"
  const authResult = token ? verifyToken(token) : null;
  if (!authResult || !authResult.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = authResult.userId; // Dapatkan userId dari token!

  try {
    // Ambil userId dari token, bukan dari query params
    // Anda bisa hapus pengambilan userId dari searchParams jika tidak diperlukan lagi
    // const { searchParams } = new URL(req.url);
    // const userId = searchParams.get('userId'); // TIDAK PERLU INI LAGI

    const expenses = await prisma.expense.findMany({
      where: { userId: userId }, // Gunakan userId dari token
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
