import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Test API called");
    return NextResponse.json({
      success: true,
      message: "Test API is working",
      timestamp: new Date().toISOString(),
      url: request.url,
    });
  } catch (error) {
    console.error("❌ Test API error:", error);
    return NextResponse.json(
      {
        error: "Test API failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
