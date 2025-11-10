import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "管理者向けの通知APIは一時的に無効化されています。",
    },
    { status: 503 },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "管理者向けの通知APIは一時的に無効化されています。",
    },
    { status: 503 },
  );
}
