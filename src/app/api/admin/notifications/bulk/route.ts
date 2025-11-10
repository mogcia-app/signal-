import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "管理者向け通知APIは現在無効化されています。",
    },
    { status: 503 },
  );
}
