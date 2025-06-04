// src/api/app/saving-goals/[goalId]/allocate/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { withCORS, handleCORSPreflight } from "@/lib/cors"; // Import helper CORS

const prisma = new PrismaClient();

// --- METHOD: POST (Allocate Funds to Saving Goal) ---
export async function POST(
  req: Request,
  { params }: { params: Promise<{ goalId: string }> }
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
    return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
  }
  const userIdFromToken = authResult.userId;

  try {
    // Await the params promise before destructuring
    const { goalId } = await params;

    const { amount, accountId } = await req.json();

    if (!goalId) {
      const response = NextResponse.json(
        { message: "Saving Goal ID is required." },
        { status: 400 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }
    if (!accountId) {
      const response = NextResponse.json(
        { message: "Source Account ID is required." },
        { status: 400 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      const response = NextResponse.json(
        {
          message:
            "Allocation amount is required and must be a positive number.",
        },
        { status: 400 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }

    const savingGoal = await prisma.savingGoal.findUnique({
      where: { id: goalId },
    });

    if (!savingGoal) {
      const response = NextResponse.json(
        { message: "Saving Goal not found." },
        { status: 404 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }
    if (savingGoal.userId !== userIdFromToken) {
      const response = NextResponse.json(
        { message: "Unauthorized: You do not own this saving goal." },
        { status: 403 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }
    if (savingGoal.isCompleted) {
      const response = NextResponse.json(
        {
          message:
            "Saving Goal is already completed. Cannot allocate more funds.",
        },
        { status: 400 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }
    if (savingGoal.currentSavedAmount + amount > savingGoal.targetAmount) {
      const response = NextResponse.json(
        {
          message: `Allocation amount exceeds the remaining target for '${
            savingGoal.name
          }'. Remaining: ${
            savingGoal.targetAmount - savingGoal.currentSavedAmount
          }.`,
          remainingTarget:
            savingGoal.targetAmount - savingGoal.currentSavedAmount,
        },
        { status: 400 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }

    const sourceAccount = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!sourceAccount) {
      const response = NextResponse.json(
        { message: "Source Account not found." },
        { status: 404 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }
    if (sourceAccount.userId !== userIdFromToken) {
      const response = NextResponse.json(
        { message: "Unauthorized: Source account does not belong to you." },
        { status: 403 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
    }
    if (sourceAccount.currentBalance < amount) {
      const response = NextResponse.json(
        {
          message: `Insufficient balance in source account '${sourceAccount.name}'. Available: ${sourceAccount.currentBalance}.`,
          accountBalance: sourceAccount.currentBalance,
          allocationAmount: amount,
        },
        { status: 400 }
      );
      return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
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

    const response = NextResponse.json(
      {
        message: `Successfully allocated ${amount} from '${updatedSourceAccount.name}' to '${updatedSavingGoal.name}'.`,
        updatedSourceAccountBalance: updatedSourceAccount.currentBalance,
        updatedSavingGoalAmount: updatedSavingGoal.currentSavedAmount,
        isGoalCompleted: updatedSavingGoal.isCompleted,
      },
      { status: 200 }
    );

    return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);
  } catch (error: unknown) {
    console.error("Error allocating funds to saving goal:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to allocate funds to saving goal.",
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
