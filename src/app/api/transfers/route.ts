// src/api/app/transfers/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import JWT verification utility

const prisma = new PrismaClient();

// --- METHOD: POST (Transfer Dana Antar Akun) ---
export async function POST(req: Request) {
  // 1. Verifikasi Token & Dapatkan userId
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401 }
    );
  }
  const userIdFromToken = payload.userId; // Dapatkan userId dari token!

  try {
    const { sourceAccountId, destinationAccountId, amount, description } =
      await req.json();

    // 2. Validasi Input Dasar
    if (
      !sourceAccountId ||
      !destinationAccountId ||
      typeof amount !== "number" ||
      isNaN(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          message:
            "Missing required fields (sourceAccountId, destinationAccountId, amount) or invalid amount.",
        },
        { status: 400 }
      );
    }

    if (sourceAccountId === destinationAccountId) {
      return NextResponse.json(
        {
          message: "Source and destination accounts cannot be the same.",
        },
        { status: 400 }
      );
    }

    // 3. Cari Akun Sumber dan Tujuan & Verifikasi Kepemilikan
    const [sourceAccount, destinationAccount] = await Promise.all([
      prisma.account.findUnique({ where: { id: sourceAccountId } }),
      prisma.account.findUnique({ where: { id: destinationAccountId } }),
    ]);

    if (!sourceAccount) {
      return NextResponse.json(
        { message: "Source account not found." },
        { status: 404 }
      );
    }
    if (!destinationAccount) {
      return NextResponse.json(
        { message: "Destination account not found." },
        { status: 404 }
      );
    }

    // Otorisasi: Pastikan kedua akun milik pengguna yang terotentikasi
    if (sourceAccount.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: Source account does not belong to you." },
        { status: 403 }
      );
    }
    if (destinationAccount.userId !== userIdFromToken) {
      return NextResponse.json(
        {
          message: "Unauthorized: Destination account does not belong to you.",
        },
        { status: 403 }
      );
    }

    // 4. Cek Saldo Akun Sumber
    if (sourceAccount.currentBalance < amount) {
      return NextResponse.json(
        {
          message: `Insufficient balance in source account '${sourceAccount.name}'. Available: ${sourceAccount.currentBalance}.`,
          accountBalance: sourceAccount.currentBalance,
          transferAmount: amount,
        },
        { status: 400 }
      );
    }

    // 5. Lakukan Transfer (Operasi Atomik Menggunakan Prisma Transaction)
    // Ini memastikan bahwa kedua update berhasil atau keduanya gagal
    const [updatedSourceAccount, updatedDestinationAccount] =
      await prisma.$transaction([
        // Kurangi dari akun sumber
        prisma.account.update({
          where: { id: sourceAccountId },
          data: { currentBalance: sourceAccount.currentBalance - amount },
        }),
        // Tambah ke akun tujuan
        prisma.account.update({
          where: { id: destinationAccountId },
          data: { currentBalance: destinationAccount.currentBalance + amount },
        }),
      ]);

    // Opsional: Anda bisa merekam transfer ini sebagai sebuah transaksi internal
    // Misalnya, membuat model 'TransferTransaction' jika ingin audit trail yang lebih detail.
    // Untuk saat ini, kita hanya update saldo akun.

    return NextResponse.json(
      {
        message: `Successfully transferred ${amount} from '${updatedSourceAccount.name}' to '${updatedDestinationAccount.name}'.`,
        transferDetails: {
          sourceAccountId: updatedSourceAccount.id,
          destinationAccountId: updatedDestinationAccount.id,
          amount: amount,
          description: description || null,
          newSourceAccountBalance: updatedSourceAccount.currentBalance,
          newDestinationAccountBalance:
            updatedDestinationAccount.currentBalance,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error during transfer:", error);
    return NextResponse.json(
      {
        message: "Failed to perform transfer.",
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
