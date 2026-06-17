import { NextResponse } from "next/server";

const N8N_DELETE_URL =
  "https://server.presswayy.com/webhook/api/v1/delete-data-chatbot";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Delete API route is working",
  });
}

export async function POST(req: Request) {
  try {
    console.log("✅ /api/chat/delete route hit");

    const body = await req.json();

    console.log("Body:", body);

    const { companyId, sessionId } = body || {};

    if (!companyId || !sessionId) {
      return NextResponse.json(
        {
          success: false,
          message: "companyId and sessionId are required.",
        },
        { status: 400 },
      );
    }

    const n8nRes = await fetch(N8N_DELETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ companyId, sessionId }),
      cache: "no-store",
    });

    const text = await n8nRes.text();

    console.log("n8n status:", n8nRes.status);
    console.log("n8n response:", text);

    return NextResponse.json(
      {
        success: n8nRes.ok,
        message: text || "n8n response received",
      },
      { status: n8nRes.status },
    );
  } catch (error) {
    console.error("Delete API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to delete chats.",
      },
      { status: 500 },
    );
  }
}
