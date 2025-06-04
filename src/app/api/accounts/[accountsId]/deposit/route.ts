// src/api/app/accounts/[accountId]/deposit/route.ts
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { withCORS, handleCORSPreflight } from "@/lib/cors";

const prisma = new PrismaClient();

// PERBAIKAN: Gunakan struktur parameter yang benar untuk Next.js 13+ App Router
export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult) {
    const response = NextResponse.json(
      { message: "Unauthorized: Invalid or missing token." },
      { status: 401 }
    );
    return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
  }

  const userIdFromToken = authResult.userId;

  try {
    // Await params untuk mendapatkan accountId
    const { accountId } = await params;
    const { amount, description } = await req.json();

    if (!accountId) {
      const response = NextResponse.json(
        { message: "Account ID is required." },
        { status: 400 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }

    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      const response = NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, userId: true, currentBalance: true, name: true },
    });

    if (!account) {
      const response = NextResponse.json(
        { message: "Account not found." },
        { status: 404 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }

    if (account.userId !== userIdFromToken) {
      const response = NextResponse.json(
        { message: "Unauthorized: Account does not belong to you." },
        { status: 403 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }

    const updatedAccountBalance = account.currentBalance + amount;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    const response = NextResponse.json(
      {
        message: `Successfully deposited ${amount} to account '${account.name}'.`,
        newAccountBalance: updatedAccountBalance,
        accountId: account.id,
        depositAmount: amount,
        description: description || null,
      },
      { status: 200 }
    );

    return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
  } catch (error: unknown) {
    console.error("Error depositing to account:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to deposit to account.",
        error: errorMessage,
      },
      { status: 500 }
    );
    return withCORS(errorResponse, ["POST"], ["Content-Type", "Authorization"]);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return handleCORSPreflight(["POST"], ["Content-Type", "Authorization"]);
}
