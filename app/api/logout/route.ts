import { NextResponse } from "next/server";
import { JWT_COOKIE_NAME } from "@/lib/config";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(JWT_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
