// app/api/sync-user/route.js
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

export const POST = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Upsert user in Supabase
    const { error } = await supabase.from("users").upsert(
      {
        id: user.id,
        username: user.username || user.firstName || "Anonymous",
        avatar_url: user.imageUrl || "",
        is_moderator: user.publicMetadata?.isMod || false,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (error) {
      console.error("Error syncing user to Supabase:", error);
      return new Response("Error syncing user", { status: 500 });
    }

    return new Response("User synced successfully", { status: 200 });
  } catch (error) {
    console.error("Sync user error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
