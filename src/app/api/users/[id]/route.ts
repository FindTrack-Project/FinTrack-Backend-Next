// src/app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/users/[id] - Mendapatkan user berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { posts: true }, // Sertakan juga post user ini
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error: unknown) {
    console.error(`Error fetching user with ID ${id}:`, error);
    return NextResponse.json(
      {
        message: "Failed to fetch user",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Menghapus user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    await prisma.user.delete({
      where: { id },
    });
    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 204 }
    );
  } catch (error: unknown) {
    console.error(`Error deleting user with ID ${id}:`, error);
    return NextResponse.json(
      {
        message: "Failed to delete user",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
