// src/app/layout.tsx (minimal)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js API Only",
  description: "API created with Next.js App Router and Prisma",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
