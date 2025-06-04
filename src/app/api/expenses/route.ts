import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS, status: 200 });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId;

  try {
    const { amount, date, description, category, accountId } = await req.json();

    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (!date || !category || !accountId) {
      return NextResponse.json(
        { message: "Missing required fields: date, category, accountId." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, userId: true, currentBalance: true },
    });

    if (!account) {
      return NextResponse.json(
        { message: "Account not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    if (account.userId !== userId) {
      return NextResponse.json(
        { message: "Unauthorized: Account does not belong to you." },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    if (account.currentBalance < amount) {
      return NextResponse.json(
        {
          message:
            "Insufficient balance in selected account. Cannot perform this expense.",
          accountBalance: account.currentBalance,
          expenseAmount: amount,
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const newExpense = await prisma.expense.create({
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        userId: userId,
        accountId: accountId,
        category: category,
      },
    });

    const updatedAccountBalance = account.currentBalance - amount;

    await prisma.account.update({
      where: { id: accountId },
      data: {
        currentBalance: updatedAccountBalance,
      },
    });

    return NextResponse.json(
      {
        message: "Expense added successfully and account balance updated.",
        expense: newExpense,
        newAccountBalance: updatedAccountBalance,
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error adding expense or updating account balance:", error);
    return NextResponse.json(
      {
        message: "Failed to add expense or update account balance.",
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId;

  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: userId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(
      { expenses },
      { status: 200, headers: CORS_HEADERS }
    );
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
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
