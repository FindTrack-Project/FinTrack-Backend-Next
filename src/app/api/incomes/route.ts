// src/api/app/incomes/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import utilitas verifikasi JWT

const prisma = new PrismaClient();

export async function POST(req: Request) {
  // Verifikasi Token
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (
    !authResult ||
    typeof authResult !== "object" ||
    !("userId" in authResult)
  ) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = (authResult as { userId: string }).userId; // Dapatkan userId dari token!

  try {
    const { amount, date, description, source } = await req.json(); // userId TIDAK perlu dari body lagi

    // 1. Validasi Input
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }
    if (!date || !source) {
      // userId sudah ada dari token
      return NextResponse.json(
        { message: "Missing required fields: date, source" },
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
      // Ini seharusnya jarang terjadi jika token valid
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // 3. Buat entri pemasukan baru
    const newIncome = await prisma.income.create({
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        userId: userId, // Gunakan userId dari token
        source: source,
      },
    });

    // 4. Perbarui currentBalance pengguna (TAMBAH SALDO)
    const updatedBalance = user.currentBalance + amount;

    await prisma.user.update({
      where: { id: userId }, // Gunakan userId dari token
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

export async function GET(req: Request) {
  // Extract token from Authorization header
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (
    !authResult ||
    typeof authResult !== "object" ||
    !("userId" in authResult)
  ) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = (authResult as { userId: string }).userId; // Dapatkan userId dari token!

  try {
    // Ambil userId dari token, bukan dari query params
    const incomes = await prisma.income.findMany({
      where: { userId: userId }, // Gunakan userId dari token
      orderBy: { date: "desc" },
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
