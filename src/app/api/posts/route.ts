// src/app/api/posts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/posts - Membuat post baru
export async function POST(request: Request) {
  try {
    const { title, content, published, authorId } = await request.json();

    if (!title || !authorId) {
      return NextResponse.json(
        { message: "Title and authorId are required" },
        { status: 400 }
      );
    }

    const newPost = await prisma.post.create({
      data: {
        title,
        content,
        published: published ?? false,
        author: {
          connect: { id: authorId },
        },
      },
    });

    return NextResponse.json(newPost, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating post:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to create post", error: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/posts - Mendapatkan semua post
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      include: { author: true }, // Sertakan data author
    });
    return NextResponse.json(posts, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching posts:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to fetch posts", error: errorMessage },
      { status: 500 }
    );
  }
}
