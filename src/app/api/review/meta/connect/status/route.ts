import { NextResponse } from "next/server";

export async function GET() {
  // TODO: 実装時はMeta Graph APIの接続確認に置き換える
  return NextResponse.json({
    success: true,
    data: {
      pageConnected: false,
      instagramConnected: false,
      pageId: null,
      instagramAccountId: null,
      note: "Template response. Replace with real Graph API check for /me/accounts and linked IG account.",
    },
  });
}
