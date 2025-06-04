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
      { message: "Invalid or missing authentication token." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId;

  try {
    const { name, targetAmount } = await req.json();

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        {
          message:
            "Saving goal name is required and must be a non-empty string.",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (
      typeof targetAmount !== "number" ||
      isNaN(targetAmount) ||
      targetAmount <= 0
    ) {
      return NextResponse.json(
        { message: "Target amount is required and must be a positive number." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { message: "User not found for this token." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const newSavingGoal = await prisma.savingGoal.create({
      data: {
        userId: userId,
        name: name.trim(),
        targetAmount: targetAmount,
        currentSavedAmount: 0,
        isCompleted: false,
      },
      select: {
        id: true,
        name: true,
        targetAmount: true,
        currentSavedAmount: true,
        isCompleted: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Saving goal created successfully.",
        savingGoal: newSavingGoal,
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error creating saving goal:", error);
    return NextResponse.json(
      {
        message: "Failed to create saving goal.",
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
      { message: "Invalid or missing authentication token." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId;

  try {
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { message: "User not found for this token." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const savingGoals = await prisma.savingGoal.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      { savingGoals },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error fetching saving goals:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch saving goals.",
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
