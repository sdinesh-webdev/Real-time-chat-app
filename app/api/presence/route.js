// app/api/presence/route.js
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
};

// GET - Get online users for a channel
export const GET = async (request) => {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelName = searchParams.get("channel");

    if (!channelName) {
      return NextResponse.json(
        { error: "Channel name required" },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Clean stale presence first (older than 1 minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    await supabase
      .from("user_presence")
      .update({ is_online: false })
      .eq("channel_name", channelName)
      .eq("is_online", true)
      .lt("last_seen", oneMinuteAgo);

    // Get online users
    const { data, error } = await supabase
      .from("user_presence")
      .select(
        `
        user_id,
        is_online,
        last_seen,
        user:users (
          id,
          username,
          avatar_url
        )
      `
      )
      .eq("channel_name", channelName)
      .eq("is_online", true)
      .order("last_seen", { ascending: false });

    if (error) {
      console.error("Error fetching presence:", error);
      return NextResponse.json(
        { error: "Failed to fetch presence" },
        { status: 500 }
      );
    }

    return NextResponse.json({ users: data || [] });
  } catch (error) {
    console.error("Presence GET error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};

// POST - Update user presence (join/heartbeat)
export const POST = async (request) => {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { channelName, action } = body;

    if (!channelName) {
      return NextResponse.json(
        { error: "Channel name required" },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Upsert presence
    const { error } = await supabase.from("user_presence").upsert(
      {
        user_id: user.id,
        channel_name: channelName,
        is_online: true,
        last_seen: new Date().toISOString(),
      },
      {
        onConflict: "user_id,channel_name",
      }
    );

    if (error) {
      console.error("Error updating presence:", error);
      return NextResponse.json(
        { error: "Failed to update presence" },
        { status: 500 }
      );
    }

    console.log(
      `✅ Presence updated: ${user.username || user.firstName} (${action})`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Presence POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};

// DELETE - User leaves channel
export const DELETE = async (request) => {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelName = searchParams.get("channel");

    if (!channelName) {
      return NextResponse.json(
        { error: "Channel name required" },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Mark as offline
    const { error } = await supabase
      .from("user_presence")
      .update({
        is_online: false,
        last_seen: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("channel_name", channelName);

    if (error) {
      console.error("Error leaving presence:", error);
      return NextResponse.json(
        { error: "Failed to leave presence" },
        { status: 500 }
      );
    }

    console.log(`🚪 User left: ${user.username || user.firstName}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Presence DELETE error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};
