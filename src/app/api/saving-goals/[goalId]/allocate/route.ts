// src/api/app/saving-goals/[goalId]/allocate/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import JWT verification utility

const prisma = new PrismaClient();

// --- METHOD: POST (Allocate Funds to Saving Goal) ---
export async function POST(
  req: Request,
  { params }: { params: { goalId: string } }
) {
  // 1. Verify Token & Get userId
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
  const userIdFromToken = payload.userId; // Get userId from token!

  try {
    const awaitedParams = await params;
    const { goalId } = awaitedParams; // Get goalId from URL parameters

    const { amount, accountId } = await req.json(); // Get allocation amount and source account ID from body

    // 2. Input Validation
    if (!goalId) {
      return NextResponse.json(
        { message: "Saving Goal ID is required." },
        { status: 400 }
      );
    }
    if (!accountId) {
      return NextResponse.json(
        { message: "Source Account ID is required." },
        { status: 400 }
      );
    }
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        {
          message:
            "Allocation amount is required and must be a positive number.",
        },
        { status: 400 }
      );
    }

    // 3. Find Saving Goal and Verify Ownership
    const savingGoal = await prisma.savingGoal.findUnique({
      where: { id: goalId },
    });

    if (!savingGoal) {
      return NextResponse.json(
        { message: "Saving Goal not found." },
        { status: 404 }
      );
    }
    if (savingGoal.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this saving goal." },
        { status: 403 }
      );
    }
    if (savingGoal.isCompleted) {
      return NextResponse.json(
        {
          message:
            "Saving Goal is already completed. Cannot allocate more funds.",
        },
        { status: 400 }
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
        { status: 400 }
      );
    }

    // 4. Find Source Account and Verify Ownership & Balance
    const sourceAccount = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!sourceAccount) {
      return NextResponse.json(
        { message: "Source Account not found." },
        { status: 404 }
      );
    }
    if (sourceAccount.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: Source account does not belong to you." },
        { status: 403 }
      );
    }
    if (sourceAccount.currentBalance < amount) {
      return NextResponse.json(
        {
          message: `Insufficient balance in source account '${sourceAccount.name}'. Available: ${sourceAccount.currentBalance}.`,
          accountBalance: sourceAccount.currentBalance,
          allocationAmount: amount,
        },
        { status: 400 }
      );
    }

    // 5. Perform the Allocation (Update Account and Saving Goal)
    // Use a Prisma transaction to ensure atomicity
    const [updatedSourceAccount, updatedSavingGoal] = await prisma.$transaction(
      [
        // Deduct amount from source account
        prisma.account.update({
          where: { id: sourceAccount.id },
          data: { currentBalance: sourceAccount.currentBalance - amount },
        }),
        // Add amount to saving goal
        prisma.savingGoal.update({
          where: { id: savingGoal.id },
          data: {
            currentSavedAmount: savingGoal.currentSavedAmount + amount,
            // Check if goal is completed after this allocation
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
      { status: 200 }
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
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
