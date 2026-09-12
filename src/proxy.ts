import { NextRequest, NextResponse } from "next/server";

const USER_COOKIE = "ugly_cat_user";

export function proxy(request: NextRequest) {
  if (request.cookies.has(USER_COOKIE)) return NextResponse.next();

  const id = crypto.randomUUID();
  const headers = new Headers(request.headers);
  const priorCookie = headers.get("cookie");
  headers.set("cookie", `${priorCookie ? `${priorCookie}; ` : ""}${USER_COOKIE}=${id}`);
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(USER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
