// スプレッドシート設計書のシート定義に対応する型。
// 本実装(Googleスプレッドシート接続)に置き換える際も、この型はそのまま流用する想定。

export type Role = "member" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  department: string; // Categories.id を参照
  role: Role;
}

export interface Category {
  id: string;
  label: string;
  requiresApproval: boolean;
}

export interface Page {
  id: string;
  categoryId: string;
  parentId: string | null;
  title: string;
  tags: string[];
  private: boolean;
  body: string; // Markdown
  updatedBy: string;
  updatedAt: string;
  archived: boolean;
  attachments: { name: string; size: string }[];
  history: { who: string; when: string; what: string }[];
}

export interface GlossaryEntry {
  term: string;
  pageId: string;
}

export interface Template {
  id: string;
  label: string;
  hint: string;
  titleTemplate: string;
  bodyTemplate: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  pageId: string | null;
}

export interface GuidelineSection {
  id: string;
  title: string;
  body: string;
}

export type InquiryType = "question" | "bug" | "request" | "other";
export type InquiryStatus = "open" | "resolved";

export interface Inquiry {
  id: string;
  type: InquiryType;
  subject: string;
  body: string;
  authorId: string;
  authorName: string;
  status: InquiryStatus;
  createdAt: string;
}

export type ApprovalStatus = "pending" | "rejected";

export interface Approval {
  id: string;
  pageId: string | null;
  title: string;
  categoryId: string;
  author: string;
  submittedAt: string;
  status: ApprovalStatus;
  newData: {
    title: string;
    body: string;
    categoryId: string;
    private: boolean;
    tags: string[];
    parentId: string | null;
  };
}
