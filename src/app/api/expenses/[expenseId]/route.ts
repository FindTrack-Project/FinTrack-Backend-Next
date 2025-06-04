// src/api/app/expenses/[expenseId]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { withCORS, handleCORSPreflight } from "@/lib/cors";

const prisma = new PrismaClient();

// --- METHOD: PUT (Update Expense) ---
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    const response = NextResponse.json(
      { message: "Invalid or missing authentication token." },
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
    // PERBAIKAN: Await params untuk mendapatkan expenseId
    const { expenseId } = await params;

    const { amount, date, description, category } = await req.json();

    if (!expenseId) {
      const response = NextResponse.json(
        { message: "Expense ID is required." },
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
    if (!date || !category) {
      const response = NextResponse.json(
        { message: "Missing required fields: date, category." },
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

    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, userId: true, amount: true, accountId: true },
    });

    if (!existingExpense) {
      const response = NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }
    if (existingExpense.userId !== userIdFromToken) {
      const response = NextResponse.json(
        { message: "Unauthorized: You do not own this expense." },
        { status: 403 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: existingExpense.accountId },
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

    const oldAmount = existingExpense.amount;
    const amountDifference = amount - oldAmount;

    if (amountDifference > 0 && account.currentBalance - amountDifference < 0) {
      const response = NextResponse.json(
        {
          message:
            "Insufficient balance in account to increase expense amount.",
          accountBalance: account.currentBalance,
          increaseAmount: amountDifference,
        },
        { status: 400 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }

    const updatedAccountBalance = account.currentBalance - amountDifference;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
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

    const response = NextResponse.json(
      {
        message: "Expense updated successfully and account balance adjusted.",
        expense: updatedExpense,
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
    console.error("Error updating expense:", error);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to update expense.",
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

// --- METHOD: DELETE (Delete Expense) ---
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    const response = NextResponse.json(
      { message: "Invalid or missing authentication token." },
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
    // PERBAIKAN: Await params untuk mendapatkan expenseId
    const { expenseId } = await params;

    if (!expenseId) {
      const response = NextResponse.json(
        { message: "Expense ID is required." },
        { status: 400 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }

    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, userId: true, amount: true, accountId: true },
    });

    if (!existingExpense) {
      const response = NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }
    if (existingExpense.userId !== userIdFromToken) {
      const response = NextResponse.json(
        { message: "Unauthorized: You do not own this expense." },
        { status: 403 }
      );
      return withCORS(
        response,
        ["PUT", "DELETE"],
        ["Content-Type", "Authorization"]
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: existingExpense.accountId },
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

    await prisma.expense.delete({
      where: { id: expenseId },
    });

    const amountToRestore = existingExpense.amount;
    const updatedAccountBalance = account.currentBalance + amountToRestore;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    const response = NextResponse.json(
      {
        message: "Expense deleted successfully and account balance adjusted.",
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
    console.error("Error deleting expense:", error);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to delete expense.",
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
