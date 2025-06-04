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

export async function POST(req: Request) {
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
    const { sourceAccountId, destinationAccountId, amount, description } =
      await req.json();

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
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (sourceAccountId === destinationAccountId) {
      return NextResponse.json(
        {
          message: "Source and destination accounts cannot be the same.",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const [sourceAccount, destinationAccount] = await Promise.all([
      prisma.account.findUnique({ where: { id: sourceAccountId } }),
      prisma.account.findUnique({ where: { id: destinationAccountId } }),
    ]);

    if (!sourceAccount) {
      return NextResponse.json(
        { message: "Source account not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    if (!destinationAccount) {
      return NextResponse.json(
        { message: "Destination account not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (sourceAccount.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: Source account does not belong to you." },
        { status: 403, headers: CORS_HEADERS }
      );
    }
    if (destinationAccount.userId !== userIdFromToken) {
      return NextResponse.json(
        {
          message: "Unauthorized: Destination account does not belong to you.",
        },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    if (sourceAccount.currentBalance < amount) {
      return NextResponse.json(
        {
          message: `Insufficient balance in source account '${sourceAccount.name}'. Available: ${sourceAccount.currentBalance}.`,
          accountBalance: sourceAccount.currentBalance,
          transferAmount: amount,
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const [updatedSourceAccount, updatedDestinationAccount] =
      await prisma.$transaction([
        prisma.account.update({
          where: { id: sourceAccountId },
          data: { currentBalance: sourceAccount.currentBalance - amount },
        }),
        prisma.account.update({
          where: { id: destinationAccountId },
          data: { currentBalance: destinationAccount.currentBalance + amount },
        }),
      ]);

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
      { status: 200, headers: CORS_HEADERS }
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
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
