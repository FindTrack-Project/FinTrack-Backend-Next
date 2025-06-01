// src/api/app/users/[userId]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      // Pilih field yang ingin Anda kembalikan. Jangan kembalikan password!
      select: {
        id: true,
        email: true,
        name: true,
        currentBalance: true,
        createdAt: true,
        updatedAt: true,
        // Anda juga bisa include relasi jika diperlukan, contoh:
        // expenses: {
        //     select: { amount: true, date: true, category: true },
        //     orderBy: { date: 'desc' },
        //     take: 5 // Ambil 5 pengeluaran terakhir
        // },
        // incomes: {
        //     select: { amount: true, date: true, source: true },
        //     orderBy: { date: 'desc' },
        //     take: 5 // Ambil 5 pemasukan terakhir
        // }
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching user details:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch user details",
        error:
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message?: string }).message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Anda bisa menambahkan PUT untuk update user, DELETE untuk menghapus user, dll.
