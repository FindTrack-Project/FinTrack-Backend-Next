import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS, status: 200 });
}

export async function POST(
  req: Request,
  { params }: { params: { goalId: string } }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userIdFromToken = payload.userId;

  try {
    const awaitedParams = await params;
    const { goalId } = awaitedParams;

    const { amount, accountId } = await req.json();

    if (!goalId) {
      return NextResponse.json(
        { message: "Saving Goal ID is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (!accountId) {
      return NextResponse.json(
        { message: "Source Account ID is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        {
          message:
            "Allocation amount is required and must be a positive number.",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const savingGoal = await prisma.savingGoal.findUnique({
      where: { id: goalId },
    });

    if (!savingGoal) {
      return NextResponse.json(
        { message: "Saving Goal not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    if (savingGoal.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this saving goal." },
        { status: 403, headers: CORS_HEADERS }
      );
    }
    if (savingGoal.isCompleted) {
      return NextResponse.json(
        {
          message:
            "Saving Goal is already completed. Cannot allocate more funds.",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (savingGoal.currentSavedAmount + amount > savingGoal.targetAmount) {
      return NextResponse.json(
        {
          message: `Allocation amount exceeds the remaining target for '${
            savingGoal.name
          }'. Remaining: ${
            savingGoal.targetAmount - savingGoal.currentSavedAmount
          }.`,
          remainingTarget:
            savingGoal.targetAmount - savingGoal.currentSavedAmount,
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const sourceAccount = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!sourceAccount) {
      return NextResponse.json(
        { message: "Source Account not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    if (sourceAccount.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: Source account does not belong to you." },
        { status: 403, headers: CORS_HEADERS }
      );
    }
    if (sourceAccount.currentBalance < amount) {
      return NextResponse.json(
        {
          message: `Insufficient balance in source account '${sourceAccount.name}'. Available: ${sourceAccount.currentBalance}.`,
          accountBalance: sourceAccount.currentBalance,
          allocationAmount: amount,
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const [updatedSourceAccount, updatedSavingGoal] = await prisma.$transaction(
      [
        prisma.account.update({
          where: { id: sourceAccount.id },
          data: { currentBalance: sourceAccount.currentBalance - amount },
        }),
        prisma.savingGoal.update({
          where: { id: savingGoal.id },
          data: {
            currentSavedAmount: savingGoal.currentSavedAmount + amount,
            isCompleted:
              savingGoal.currentSavedAmount + amount >= savingGoal.targetAmount,
          },
        }),
      ]
    );

    return NextResponse.json(
      {
        message: `Successfully allocated ${amount} from '${updatedSourceAccount.name}' to '${updatedSavingGoal.name}'.`,
        updatedSourceAccountBalance: updatedSourceAccount.currentBalance,
        updatedSavingGoalAmount: updatedSavingGoal.currentSavedAmount,
        isGoalCompleted: updatedSavingGoal.isCompleted,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error allocating funds to saving goal:", error);
    return NextResponse.json(
      {
        message: "Failed to allocate funds to saving goal.",
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
