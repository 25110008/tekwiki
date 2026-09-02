import { NextResponse } from "next/server";
import { getApprovals, getCategories, getFaqs, getGlossary, getGuidelines, getPages, getTemplates, getUsers } from "@/lib/server/repo";

export async function GET() {
  const [categories, users, pages, glossary, templates, faqs, guidelines, approvals] = await Promise.all([
    getCategories(),
    getUsers(),
    getPages(),
    getGlossary(),
    getTemplates(),
    getFaqs(),
    getGuidelines(),
    getApprovals(),
  ]);

  return NextResponse.json({ categories, users, pages, glossary, templates, faqs, guidelines, approvals });
}
