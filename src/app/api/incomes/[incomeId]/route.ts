import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS, status: 200 });
}

export async function PUT(
  req: Request,
  { params }: { params: { incomeId: string } }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return NextResponse.json(
      { message: "Authorization token missing." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Invalid or expired token." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userIdFromToken = authResult.userId;

  try {
    const awaitedParams = await params;
    const { incomeId } = awaitedParams;

    const { amount, date, description, source } = await req.json();

    if (!incomeId) {
      return NextResponse.json(
        { message: "Income ID is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (!date || !source) {
      return NextResponse.json(
        { message: "Missing required fields: date, source." },
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

    const existingIncome = await prisma.income.findUnique({
      where: { id: incomeId },
      select: { id: true, userId: true, amount: true, accountId: true },
    });

    if (!existingIncome) {
      return NextResponse.json(
        { message: "Income not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    if (existingIncome.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this income." },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: existingIncome.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      return NextResponse.json(
        { message: "Associated account not found." },
        { status: 404, headers: CORS_HEADERS }
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

    return NextResponse.json(
      {
        message: "Income updated successfully and account balance adjusted.",
        income: updatedIncome,
        newAccountBalance: updatedAccountBalance,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error updating income:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      {
        message: "Failed to update income.",
        error: errorMessage,
      },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { incomeId: string } }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return NextResponse.json(
      { message: "Authorization token missing." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Invalid or expired token." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userIdFromToken = authResult.userId;

  try {
    const awaitedParams = await params;
    const { incomeId } = awaitedParams;

    if (!incomeId) {
      return NextResponse.json(
        { message: "Income ID is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const existingIncome = await prisma.income.findUnique({
      where: { id: incomeId },
      select: { id: true, userId: true, amount: true, accountId: true },
    });

    if (!existingIncome) {
      return NextResponse.json(
        { message: "Income not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    if (existingIncome.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this income." },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: existingIncome.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      return NextResponse.json(
        { message: "Associated account not found." },
        { status: 404, headers: CORS_HEADERS }
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

    return NextResponse.json(
      {
        message: "Income deleted successfully and account balance adjusted.",
        newAccountBalance: updatedAccountBalance,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error deleting income:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      {
        message: "Failed to delete income.",
        error: errorMessage,
      },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
