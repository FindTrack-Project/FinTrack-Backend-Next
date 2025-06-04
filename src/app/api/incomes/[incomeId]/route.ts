// src/api/app/incomes/[incomeId]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { withCORS, handleCORSPreflight } from "@/lib/cors";

const prisma = new PrismaClient();

// --- METHOD: PUT (Update Income) ---
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ incomeId: string }> }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    const response = NextResponse.json(
      { message: "Unauthorized: Invalid or missing token." },
      { status: 401 }
    );
    return withCORS(
      response,
      ["PUT", "DELETE"],
      ["Content-Type", "Authorization"]
    );
  }
  const userIdFromToken = authResult.userId;

  try {
    // PERBAIKAN: Await params untuk mendapatkan incomeId
    const { incomeId } = await params;

    const { amount, date, description, source } = await req.json();

    if (!incomeId) {
      const response = NextResponse.json(
        { message: "Income ID is required." },
        { status: 400 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      const response = NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }
    if (!date || !source) {
      const response = NextResponse.json(
        { message: "Missing required fields: date, source." },
        { status: 400 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      const response = NextResponse.json(
        { message: "Invalid date format." },
        { status: 400 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }

    const existingIncome = await prisma.income.findUnique({
      where: { id: incomeId },
      select: { id: true, userId: true, amount: true, accountId: true },
    });

    if (!existingIncome) {
      const response = NextResponse.json(
        { message: "Income not found." },
        { status: 404 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }
    if (existingIncome.userId !== userIdFromToken) {
      const response = NextResponse.json(
        { message: "Unauthorized: You do not own this income." },
        { status: 403 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: existingIncome.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      const response = NextResponse.json(
        { message: "Associated account not found." },
        { status: 404 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }

    const oldAmount = existingIncome.amount;
    const amountDifference = amount - oldAmount;
    const updatedAccountBalance = account.currentBalance + amountDifference;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    const updatedIncome = await prisma.income.update({
      where: { id: incomeId },
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        source: source,
      },
    });

    const response = NextResponse.json(
      {
        message: "Income updated successfully and account balance adjusted.",
        income: updatedIncome,
        newAccountBalance: updatedAccountBalance,
      },
      { status: 200 }
    );

    return withCORS(
      response,
      ["PUT", "DELETE"],
      ["Content-Type", "Authorization"]
    );
  } catch (error: unknown) {
    console.error("Error updating income:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to update income.",
        error: errorMessage,
      },
      { status: 500 }
    );
    return withCORS(
      errorResponse,
      ["PUT", "DELETE"],
      ["Content-Type", "Authorization"]
    );
  } finally {
    await prisma.$disconnect();
  }
}

// --- METHOD: DELETE (Delete Income) ---
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ incomeId: string }> }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    const response = NextResponse.json(
      { message: "Unauthorized: Invalid or missing token." },
      { status: 401 }
    );
    return withCORS(
      response,
      ["PUT", "DELETE"],
      ["Content-Type", "Authorization"]
    );
  }
  const userIdFromToken = authResult.userId;

  try {
    // PERBAIKAN: Await params untuk mendapatkan incomeId
    const { incomeId } = await params;

    if (!incomeId) {
      const response = NextResponse.json(
        { message: "Income ID is required." },
        { status: 400 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }

    const existingIncome = await prisma.income.findUnique({
      where: { id: incomeId },
      select: { id: true, userId: true, amount: true, accountId: true },
    });

    if (!existingIncome) {
      const response = NextResponse.json(
        { message: "Income not found." },
        { status: 404 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }
    if (existingIncome.userId !== userIdFromToken) {
      const response = NextResponse.json(
        { message: "Unauthorized: You do not own this income." },
        { status: 403 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: existingIncome.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      const response = NextResponse.json(
        { message: "Associated account not found." },
        { status: 404 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }

    await prisma.income.delete({
      where: { id: incomeId },
    });

    const amountToDeduct = existingIncome.amount;
    const updatedAccountBalance = account.currentBalance - amountToDeduct;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    const response = NextResponse.json(
      {
        message: "Income deleted successfully and balance adjusted.",
        newAccountBalance: updatedAccountBalance,
      },
      { status: 200 }
    );

    return withCORS(
      response,
      ["PUT", "DELETE"],
      ["Content-Type", "Authorization"]
    );
  } catch (error: unknown) {
    console.error("Error deleting income:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to delete income.",
        error: errorMessage,
      },
      { status: 500 }
    );
    return withCORS(
      errorResponse,
      ["PUT", "DELETE"],
      ["Content-Type", "Authorization"]
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return handleCORSPreflight(
    ["PUT", "DELETE"],
    ["Content-Type", "Authorization"]
  );
}
