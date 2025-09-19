export async function GET() {
  return Response.json({ message: "Hello from Next.js API!" });
}

export async function POST() {
  return Response.json({ message: "POST from Next.js API!" });
}

