// src/app/api/users/[id]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Fungsi helper CORS Anda (Biarkan ini tetap di atas)
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

// Handler untuk Preflight OPTIONS requests (Biarkan ini tetap ada)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response);
}

// ================================================================
// HAPUS ATAU KOMENTARI DEFINISI INTERFACE INI:
// interface RouteParams {
//   id: string;
// }
// interface RouteContext {
//   params: RouteParams;
// }
// ================================================================

// GET /api/users/[id]
// Ubah signature fungsi menjadi seperti ini:
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Perhatikan bagian ini!
  const { id } = params; // Akses 'id' dari params secara langsung
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { posts: true },
    });

    if (!user) {
      const response = NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
      return addCorsHeaders(response);
    }

    const response = NextResponse.json(user, { status: 200 });
    return addCorsHeaders(response);
  } catch (error: unknown) {
    console.error(`Error fetching user with ID ${id}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const response = NextResponse.json(
      { message: "Failed to fetch user", error: errorMessage },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

// DELETE /api/users/[id]
// Ubah signature fungsi menjadi seperti ini juga:
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Perhatikan bagian ini!
  const { id } = params; // Akses 'id' dari params secara langsung
  try {
    await prisma.user.delete({
      where: { id },
    });
    const response = NextResponse.json(
      { message: "User deleted successfully" },
      { status: 204 }
    );
    return addCorsHeaders(response);
  } catch (error: unknown) {
    console.error(`Error deleting user with ID ${id}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const response = NextResponse.json(
      { message: "Failed to delete user", error: errorMessage },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}
