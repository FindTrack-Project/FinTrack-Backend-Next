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
  if (!authResult || !("userId" in authResult)) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId;

  try {
    const { amount, date, description, source, accountId } = await req.json();

    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (!date || !source || !accountId) {
      return NextResponse.json(
        { message: "Missing required fields: date, source, accountId." },
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

    const newIncome = await prisma.income.create({
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        userId: userId,
        accountId: accountId,
        source: source,
      },
    });

    const updatedAccountBalance = account.currentBalance + amount;

    await prisma.account.update({
      where: { id: account.id },
      data: {
        currentBalance: updatedAccountBalance,
      },
    });

    return NextResponse.json(
      {
        message: "Income added successfully and account balance updated.",
        income: newIncome,
        newAccountBalance: updatedAccountBalance,
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error adding income or updating account balance:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      {
        message: "Failed to add income or update account balance.",
        error: errorMessage,
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
  if (!authResult || !("userId" in authResult)) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId;

  try {
    const incomes = await prisma.income.findMany({
      where: { userId: userId },
    });

    return NextResponse.json(
      {
        message: "Incomes fetched successfully.",
        incomes: incomes,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error fetching incomes:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      {
        message: "Failed to fetch incomes",
        error: errorMessage,
      },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
