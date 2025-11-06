export async function GET() {
  return Response.json({
    message: "GET request received",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({
    message: "POST request received",
    data: body,
    timestamp: new Date().toISOString(),
  });
}
