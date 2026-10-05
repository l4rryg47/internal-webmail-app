import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });

  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
