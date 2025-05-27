import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, generateToken } from "@/lib/auth";

function addCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "http://localhost:3000");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response);
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      const response = NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const response = NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
      return addCorsHeaders(response);
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      const response = NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
      return addCorsHeaders(response);
    }

    const token = generateToken(user.id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    const response = NextResponse.json(
      { user: userWithoutPassword, token },
      { status: 200 }
    );
    return addCorsHeaders(response);
  } catch (error: unknown) {
    console.error("Login error:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    const response = NextResponse.json(
      { message: "Login failed", error: errorMessage },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}
