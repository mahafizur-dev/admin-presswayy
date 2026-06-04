import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Forwarding the exact multi-part stream server-to-server (Bypasses CORS entirely)
    const forwardFormData = new FormData();
    forwardFormData.append("file", file);

    const externalResponse = await fetch(
      "https://server.presswayy.com/webhook/product-inventory",
      {
        method: "POST",
        body: forwardFormData,
        // If the webhook requires a token, safely fetch it from your server environment variables here
        headers: {
          // 'Authorization': `Bearer ${process.env.PRESSWAYY_API_KEY}`,
        },
      },
    );

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      return NextResponse.json(
        { error: `External server error: ${errorText}` },
        { status: externalResponse.status },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Proxy Error" },
      { status: 500 },
    );
  }
}
