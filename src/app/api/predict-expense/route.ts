// app/api/predict-expense/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Import default Prisma Client instance
import { Expense, BudgetRecommendation } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    const startOfCurrentMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    const expenses: Expense[] = await prisma.expense.findMany({
      where: {
        userId: userId,
        type: "Pengeluaran",
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
    expenses.forEach((expense: Expense) => {
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

    // --- PENANGANAN JIKA DATA HISTORIS KOSONG ATAU MINIM ---
    const totalExpensesInPeriod = last6MonthsData.reduce(
      (sum, amount) => sum + amount,
      0
    );

    if (totalExpensesInPeriod === 0) {
      console.log(
        `No historical expenses found for user ${userId}. Returning a default budget.`
      );
      // Anda bisa mengembalikan rekomendasi default atau pesan khusus
      return NextResponse.json(
        {
          predicted_expense: 0, // Atau angka default lainnya, misal 500000
          message: "No historical expenses found. Returning default budget.",
        },
        { status: 200 }
      );
    }

    // Validasi final sebelum mengirim ke Flask ML API
    if (last6MonthsData.length !== 6) {
      console.error(
        "Error: Expected 6 months of data, but got:",
        last6MonthsData.length
      );
      return NextResponse.json(
        {
          error:
            "Failed to retrieve sufficient historical data for prediction.",
        },
        { status: 500 }
      );
    }

    console.log("Sending to Flask ML API:", last6MonthsData);

    // --- 2. Panggil API Flask ML Anda ---
    const flaskApiUrl =
      process.env.FLASK_API_URL || "http://localhost:5000/predict_expense";

    const flaskResponse = await fetch(flaskApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ last_6_months_data: last6MonthsData }),
    });

    // --- 3. Tangani Respons dari API Flask ---
    if (!flaskResponse.ok) {
      const errorData = await flaskResponse.json();
      console.error("Error from Flask API:", errorData);
      return NextResponse.json(errorData, { status: flaskResponse.status });
    }

    const predictionData = await flaskResponse.json();
    const predictedExpense = predictionData.predicted_expense;

    // --- 4. Opsional: Simpan Rekomendasi ke Database menggunakan Prisma ---
    if (predictedExpense !== undefined && predictedExpense !== null) {
      try {
        const nextMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1
        );
        nextMonth.setHours(0, 0, 0, 0);

        const existingBudget: BudgetRecommendation | null =
          await prisma.budgetRecommendation.findUnique({
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

    return NextResponse.json(predictionData, { status: 200 });
  } catch (error) {
    console.error("Error in predict-expense API route:", error);
    return NextResponse.json(
      { error: "Internal server error: Failed to process request." },
      { status: 500 }
    );
  }
}
