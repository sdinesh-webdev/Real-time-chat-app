// app/api/supabase-token/route.js
import { currentUser } from "@clerk/nextjs/server";
import { SignJWT } from "jose";

export const GET = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Create a JWT token for Supabase RLS
    const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

    const token = await new SignJWT({
      sub: user.id,
      role: "authenticated",
      aud: "authenticated",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Supabase token generation error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
