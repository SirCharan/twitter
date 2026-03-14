import { NextResponse } from "next/server";

const RESEND_URL = "https://api.resend.com/emails";

export async function POST(request: Request) {
  try {
    const { name, email, category, message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
    }

    const subjectPreview = message.trim().slice(0, 60);
    const emailBody = [
      `Category: ${category || "General Feedback"}`,
      `Name: ${name || "Anonymous"}`,
      `Email: ${email || "Not provided"}`,
      "",
      message,
    ].join("\n");

    const payload: Record<string, unknown> = {
      from: "Stocky Landing <onboarding@resend.dev>",
      to: "charandeepkapoor3@gmail.com",
      subject: `[Stocky ${category || "Feedback"}] ${subjectPreview}`,
      text: emailBody,
    };

    if (email?.trim()) {
      payload.reply_to = email.trim();
    }

    const resp = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      console.error("[feedback] Resend error:", await resp.text());
      return NextResponse.json({ error: "Failed to send feedback" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[feedback] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const runtime = "edge";
