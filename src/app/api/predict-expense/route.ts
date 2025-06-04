import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS, status: 200 });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || "";
  const authResult = verifyToken(token);
  if (!authResult) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId;

  try {
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const startOfCurrentMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    const expenses = await prisma.expense.findMany({
      where: {
        userId: userId,
        date: {
          gte: sixMonthsAgo,
          lt: startOfCurrentMonth,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    const monthlyExpensesMap = new Map<string, number>();
    expenses.forEach((expense) => {
      const monthKey = `${expense.date.getFullYear()}-${(
        expense.date.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}`;
      monthlyExpensesMap.set(
        monthKey,
        (monthlyExpensesMap.get(monthKey) || 0) + expense.amount
      );
    });

    const last6MonthsData: number[] = [];
    for (let i = 6; i > 0; i--) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${targetDate.getFullYear()}-${(
        targetDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}`;
      last6MonthsData.push(monthlyExpensesMap.get(monthKey) || 0);
    }

    const totalExpensesInPeriod = last6MonthsData.reduce(
      (sum, amount) => sum + amount,
      0
    );

    if (totalExpensesInPeriod === 0) {
      console.log(
        `No historical expenses found for user ${userId} in the last 6 months. Returning a default budget.`
      );
      return NextResponse.json(
        {
          predicted_expense: 0,
          message:
            "No historical expenses found for prediction. Returning default budget.",
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (last6MonthsData.length !== 6) {
      console.error(
        "Error: Expected 6 months of data for ML model, but got:",
        last6MonthsData.length
      );
      return NextResponse.json(
        {
          error:
            "Failed to retrieve sufficient historical data for prediction (expected 6 months).",
        },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    console.log(`Sending to Flask ML API for user ${userId}:`, last6MonthsData);

    const flaskApiUrl =
      process.env.FLASK_API_URL || "http://localhost:5000/predict_expense";

    const flaskResponse = await fetch(flaskApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ last_6_months_data: last6MonthsData }),
    });

    if (!flaskResponse.ok) {
      const errorData = await flaskResponse.json();
      console.error("Error from Flask API:", errorData);
      return NextResponse.json(errorData, {
        status: flaskResponse.status,
        headers: CORS_HEADERS,
      });
    }

    const predictionData = await flaskResponse.json();
    const predictedExpense = predictionData.predicted_expense;

    if (predictedExpense !== undefined && predictedExpense !== null) {
      try {
        const nextMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1
        );
        nextMonth.setHours(0, 0, 0, 0);

        const existingBudget = await prisma.budgetRecommendation.findUnique({
          where: {
            month_userId_unique: {
              month: nextMonth,
              userId: userId,
            },
          },
        });

        if (existingBudget) {
          await prisma.budgetRecommendation.update({
            where: {
              id: existingBudget.id,
            },
            data: {
              amount: predictedExpense,
            },
          });
          console.log(
            `Updated budget recommendation for ${
              nextMonth.toISOString().split("T")[0]
            } (User: ${userId}): ${predictedExpense}`
          );
        } else {
          await prisma.budgetRecommendation.create({
            data: {
              userId: userId,
              month: nextMonth,
              amount: predictedExpense,
            },
          });
          console.log(
            `Created new budget recommendation for ${
              nextMonth.toISOString().split("T")[0]
            } (User: ${userId}): ${predictedExpense}`
          );
        }
      } catch (dbError) {
        console.error(
          "Error saving budget recommendation to database:",
          dbError
        );
      }
    }

    return NextResponse.json(predictionData, {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (error: unknown) {
    console.error("Error in predict-expense API route:", error);
    return NextResponse.json(
      {
        error: "Internal server error: Failed to process request.",
        details: error instanceof Error ? error.message : "No details",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
