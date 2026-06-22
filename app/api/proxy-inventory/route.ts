import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const companyId = formData.get("companyId") as string; // <-- client "companyId" পাঠায়

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "No companyId provided" },
        { status: 400 },
      );
    }

    const forwardFormData = new FormData();
    forwardFormData.append("file", file);
    forwardFormData.append("company_id", companyId); // <-- webhook "company_id" চায়

    const externalResponse = await fetch(
      "https://server.presswayy.com/webhook/product-inventory",
      {
        method: "POST",
        body: forwardFormData,
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
