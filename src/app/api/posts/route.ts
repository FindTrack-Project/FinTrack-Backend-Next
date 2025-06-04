import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS, status: 200 });
}

export async function POST(request: Request) {
  try {
    const { title, content, published, authorId } = await request.json();

    if (!title || !authorId) {
      return NextResponse.json(
        { message: "Title and authorId are required" },
        { status: 400, headers: CORS_HEADERS }
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

    return NextResponse.json(newPost, { status: 201, headers: CORS_HEADERS });
  } catch (error: unknown) {
    console.error("Error creating post:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to create post", error: errorMessage },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      include: { author: true },
    });
    return NextResponse.json(posts, { status: 200, headers: CORS_HEADERS });
  } catch (error: unknown) {
    console.error("Error fetching posts:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to fetch posts", error: errorMessage },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
