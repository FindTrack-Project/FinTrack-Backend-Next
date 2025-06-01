// app/api/expenses/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Import default Prisma Client instance
import { Expense } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, amount, category, type, date, description } = body;

    // --- Validasi Input ---
    // Pastikan semua field yang wajib ada
    if (!userId || typeof amount !== "number" || !category || !type || !date) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: userId, amount, category, type, date.",
        },
        { status: 400 }
      );
    }

    // Validasi tipe dan nilai jika diperlukan (misalnya amount > 0, type valid)
    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number." },
        { status: 400 }
      );
    }
    const validTypes = ["Pengeluaran", "Pemasukan"]; // Sesuaikan dengan tipe yang Anda harapkan
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}.` },
        { status: 400 }
      );
    }

    // Pastikan user dengan userId tersebut ada
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }, // Hanya ambil ID untuk efisiensi
    });

    if (!userExists) {
      return NextResponse.json(
        { error: "User with provided ID does not exist." },
        { status: 404 }
      );
    }

    // Konversi tanggal string ke objek Date untuk Prisma
    const expenseDate = new Date(date);
    if (isNaN(expenseDate.getTime())) {
      // Cek apakah tanggal valid
      return NextResponse.json(
        { error: "Invalid date format. Please use a valid date string." },
        { status: 400 }
      );
    }

    // --- Simpan Data ke Database Menggunakan Prisma ---
    const newExpense: Expense = await prisma.expense.create({
      data: {
        userId: userId,
        amount: amount,
        category: category,
        type: type,
        date: expenseDate,
        description: description || null, // Jika deskripsi tidak ada, simpan sebagai null
      },
    });

    // --- Beri Respons Sukses ---
    return NextResponse.json(
      { message: "Expense added successfully", expense: newExpense },
      { status: 201 } // Status 201 Created
    );
  } catch (error) {
    console.error("Error adding expense:", error);
    // Tangani error spesifik dari Prisma jika diperlukan
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Internal server error: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error: An unknown error occurred." },
      { status: 500 }
    );
  }
}

// Opsional: Anda juga bisa menambahkan GET request untuk mengambil daftar expenses
// export async function GET(request: Request) {
//     try {
//         const { searchParams } = new URL(request.url);
//         const userId = searchParams.get('userId');

//         if (!userId) {
//             return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
//         }

//         const expenses = await prisma.expense.findMany({
//             where: { userId: userId },
//             orderBy: { date: 'desc' }
//         });
//         return NextResponse.json(expenses, { status: 200 });
//     } catch (error) {
//         console.error('Error fetching expenses:', error);
//         return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
//     }
// }
