import { NextResponse } from "next/server";

const maintenanceResponse = NextResponse.json(
  {
    success: false,
    error: "管理者向け通知APIは現在無効化されています。",
  },
  { status: 503 },
);

export async function GET() {
  return maintenanceResponse;
}

export async function PUT() {
  return maintenanceResponse;
}

export async function DELETE() {
  return maintenanceResponse;
}
