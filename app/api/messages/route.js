// app/api/messages/route.js
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

// GET messages for a channel
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

    // Get channel ID
    const { data: channelData, error: channelError } = await supabase
      .from("channels")
      .select("id")
      .eq("name", channelName)
      .single();

    if (channelError || !channelData) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Get messages
    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        id,
        content,
        created_at,
        user:users (
          id,
          username,
          avatar_url
        )
      `
      )
      .eq("channel_id", channelData.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: data });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};

// POST new message
export const POST = async (request) => {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { channelName, content } = body;

    if (!channelName || !content) {
      return NextResponse.json(
        { error: "Channel name and content required" },
        { status: 400 }
      );
    }

    // Check if it's announcements channel and user is not a mod
    if (channelName === "announcements" && !user.publicMetadata?.isMod) {
      return NextResponse.json(
        { error: "Only moderators can post in announcements" },
        { status: 403 }
      );
    }

    const supabase = getServiceRoleClient();

    // Get channel ID
    const { data: channelData, error: channelError } = await supabase
      .from("channels")
      .select("id")
      .eq("name", channelName)
      .single();

    if (channelError || !channelData) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Insert message
    const { data, error } = await supabase
      .from("messages")
      .insert({
        channel_id: channelData.id,
        user_id: user.id,
        content: content,
      })
      .select(
        `
        id,
        content,
        created_at,
        user:users (
          id,
          username,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error("Error creating message:", error);
      return NextResponse.json(
        { error: "Failed to create message", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};
