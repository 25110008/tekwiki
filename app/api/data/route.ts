import { NextResponse } from "next/server";
import { getAllData } from "@/lib/server/repo";

export async function GET() {
  const data = await getAllData();
  return NextResponse.json(data);
}
