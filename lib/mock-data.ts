// ダミーデータ。本実装ではこのファイルをGoogleスプレッドシート読み書き処理に置き換える。
import type {
  User,
  Category,
  Page,
  GlossaryEntry,
  Template,
  FaqItem,
  GuidelineSection,
} from "./types";

export const ORG_DOMAIN = "tcdigital.jp";

export const CATEGORIES: Category[] = [
  { id: "all", label: "全社共通", requiresApproval: true },
  { id: "dev", label: "開発部", requiresApproval: false },
  { id: "sales", label: "営業部", requiresApproval: false },
  { id: "hr", label: "人事部", requiresApproval: false },
  { id: "gen", label: "総務部", requiresApproval: false },
];

export const USERS: User[] = [
  { id: "tanaka", name: "田中 沙織", email: "tanaka@tcdigital.jp", department: "sales", role: "member" },
  { id: "sato", name: "佐藤 健", email: "sato@tcdigital.jp", department: "dev", role: "member" },
  { id: "admin", name: "システム管理者", email: "admin@tcdigital.jp", department: "all", role: "admin" },
];

export const PAGES: Page[] = [
  {
    id: "p1", categoryId: "all", parentId: null, title: "新入社員オンボーディングガイド",
    tags: ["オンボーディング", "ルール"], private: false,
    body: "初出社日の流れ、貸与PCのセットアップ、社内ツールのアカウント発行手順をまとめています。\n\n経費精算や有給の申請方法についても、それぞれのページを事前に確認しておきましょう。",
    updatedBy: "人事部・鈴木", updatedAt: "2026-08-20", archived: false,
    attachments: [{ name: "オンボーディングチェックリスト.pdf", size: "412KB" }],
    history: [
      { who: "鈴木 一郎(人事部)", when: "2026-08-20 10:12", what: "貸与PC手順のスクリーンショットを更新" },
      { who: "鈴木 一郎(人事部)", when: "2026-06-02 09:40", what: "初版作成" },
    ],
  },
  {
    id: "p2", categoryId: "all", parentId: null, title: "経費精算のやり方",
    tags: ["ルール", "テンプレート"], private: false,
    body: "経費精算システムへの入力方法と、領収書の提出ルールを説明します。1万円を超える立替は事前申請が必要です。締め日は毎月25日です。",
    updatedBy: "総務部・伊藤", updatedAt: "2026-08-28", archived: false,
    attachments: [{ name: "経費精算フォーム.xlsx", size: "38KB" }],
    history: [{ who: "伊藤 真弓(総務部)", when: "2026-08-28 14:03", what: "締め日の記載を追加" }],
  },
  {
    id: "p3", categoryId: "dev", parentId: null, title: "デプロイ手順書",
    tags: ["手順書", "開発"], private: false,
    body: "本番環境へのデプロイは必ずステージング環境での確認後に行います。\n\n## 手順\n- CIが緑になっていることを確認する\n- リリースタグを作成する\n- `npm run deploy:prod` を実行する\n\nデプロイ後に障害対応が必要になった場合は、障害対応フローに従ってください。",
    updatedBy: "開発部・佐藤", updatedAt: "2026-08-30", archived: false,
    attachments: [],
    history: [
      { who: "佐藤 健(開発部)", when: "2026-08-30 17:20", what: "ロールバック手順の章を追加" },
      { who: "佐藤 健(開発部)", when: "2026-07-11 11:00", what: "初版作成" },
    ],
  },
  {
    id: "p4", categoryId: "dev", parentId: null, title: "障害対応フロー",
    tags: ["手順書", "セキュリティ"], private: true,
    body: "障害検知時は、まずオンコール担当に連絡し、影響範囲を切り分けます。重大障害の場合は経営陣への一次報告を30分以内に行ってください。詳細な連絡先リストは添付を参照。",
    updatedBy: "開発部・佐藤", updatedAt: "2026-08-15", archived: false,
    attachments: [{ name: "緊急連絡先一覧.pdf", size: "120KB" }],
    history: [{ who: "佐藤 健(開発部)", when: "2026-08-15 09:00", what: "連絡先リストを更新" }],
  },
  {
    id: "p5", categoryId: "sales", parentId: null, title: "見積書テンプレートの使い方",
    tags: ["テンプレート"], private: false,
    body: "共通の見積書テンプレートを使用してください。値引き率に応じて承認者が変わります。\n\n| 値引き率 | 承認者 |\n| --- | --- |\n| 〜10% | 担当者のみ |\n| 〜20% | 上長 |\n| 20%以上 | 部長 |\n\nテンプレートの改変は禁止です。",
    updatedBy: "営業部・田中", updatedAt: "2026-08-10", archived: false,
    attachments: [{ name: "見積書テンプレート.xlsx", size: "54KB" }],
    history: [{ who: "田中 沙織(営業部)", when: "2026-08-10 13:30", what: "承認フローの記載を追加" }],
  },
  {
    id: "p6", categoryId: "sales", parentId: null, title: "主要取引先一覧",
    tags: ["セキュリティ"], private: true,
    body: "主要取引先の担当者連絡先と契約条件をまとめています。社外への共有は厳禁です。",
    updatedBy: "営業部・田中", updatedAt: "2026-07-30", archived: false,
    attachments: [],
    history: [{ who: "田中 沙織(営業部)", when: "2026-07-30 16:10", what: "契約更新情報を反映" }],
  },
  {
    id: "p7", categoryId: "hr", parentId: null, title: "有給休暇申請ルール",
    tags: ["ルール"], private: false,
    body: "有給休暇は取得予定日の3営業日前までに申請してください。半日単位での取得も可能です。",
    updatedBy: "人事部・鈴木", updatedAt: "2026-08-05", archived: false,
    attachments: [],
    history: [{ who: "鈴木 一郎(人事部)", when: "2026-08-05 10:00", what: "半日休暇に関する記載を追加" }],
  },
  {
    id: "p8", categoryId: "gen", parentId: null, title: "備品購入申請フロー",
    tags: ["手順書"], private: false,
    body: "1万円未満の備品は部署内承認のみで購入可能です。1万円以上は総務部を経由した申請が必要です。1万円以上の支出は経費精算のルールと合わせて確認してください。",
    updatedBy: "総務部・伊藤", updatedAt: "2026-07-22", archived: false,
    attachments: [],
    history: [{ who: "伊藤 真弓(総務部)", when: "2026-07-22 15:45", what: "金額基準を改定" }],
  },
  {
    id: "p9", categoryId: "dev", parentId: "p3", title: "ロールバック手順の詳細",
    tags: ["手順書"], private: false,
    body: "直前のリリースタグにチェックアウトし、デプロイスクリプトを再実行します。\n\n```\ngit checkout <前回のタグ>\nnpm run deploy:prod\n```\n\nDBマイグレーションを伴う場合は先に影響範囲を確認してください。",
    updatedBy: "開発部・佐藤", updatedAt: "2026-08-30", archived: false,
    attachments: [],
    history: [{ who: "佐藤 健(開発部)", when: "2026-08-30 17:25", what: "デプロイ手順書から分離して新規作成" }],
  },
  {
    id: "p10", categoryId: "dev", parentId: "p4", title: "過去の障害事例集",
    tags: ["セキュリティ"], private: true,
    body: "過去に発生した障害の事象・原因・再発防止策を時系列でまとめています。新しい障害対応の際は類似事例がないか確認してください。",
    updatedBy: "開発部・佐藤", updatedAt: "2026-08-16", archived: false,
    attachments: [],
    history: [{ who: "佐藤 健(開発部)", when: "2026-08-16 11:00", what: "初版作成" }],
  },
];

export const GLOSSARY: GlossaryEntry[] = [
  { term: "有給", pageId: "p7" },
  { term: "経費精算", pageId: "p2" },
  { term: "デプロイ", pageId: "p3" },
  { term: "障害対応", pageId: "p4" },
  { term: "取引先", pageId: "p6" },
  { term: "備品購入", pageId: "p8" },
  { term: "オンボーディング", pageId: "p1" },
  { term: "見積書", pageId: "p5" },
];

export const TEMPLATES: Template[] = [
  { id: "blank", label: "白紙", hint: "自由に書き始めます", titleTemplate: "", bodyTemplate: "" },
  { id: "minutes", label: "議事録", hint: "会議の記録用テンプレート", titleTemplate: "◯◯定例MTG議事録", bodyTemplate: "**日時**：\n**参加者**：\n\n## アジェンダ\n- \n- \n\n## 決定事項\n- \n\n## ToDo\n- 担当：　期限：" },
  { id: "spec", label: "仕様書", hint: "機能・システムの仕様整理用", titleTemplate: "◯◯機能 仕様書", bodyTemplate: "## 概要\n\n## 背景・目的\n\n## 要件\n- \n\n## 画面・API仕様\n\n## 非機能要件" },
  { id: "incident", label: "障害報告", hint: "障害の記録・振り返り用", titleTemplate: "障害報告：◯◯", bodyTemplate: "**発生日時**：\n**影響範囲**：\n\n## 事象\n\n## 原因\n\n## 対応内容\n\n## 再発防止策" },
  { id: "onboarding", label: "オンボーディング", hint: "新メンバー向け受け入れ資料", titleTemplate: "◯◯部 オンボーディング資料", bodyTemplate: "## 初日にやること\n\n## 必要な権限・アカウント\n\n## よく使うツール\n\n## 最初の1週間の流れ" },
];

export const FAQS: FaqItem[] = [
  { id: "f1", question: "有給休暇はいつまでに申請すればいい？", answer: "有給休暇は取得予定日の3営業日前までに申請してください。半日単位での取得も可能です。", pageId: "p7" },
  { id: "f2", question: "経費精算の締め日はいつ？", answer: "経費精算の締め日は毎月25日です。1万円を超える立替は事前申請が必要です。", pageId: "p2" },
  { id: "f3", question: "本番デプロイの前に何を確認すればいい？", answer: "デプロイの前にステージング環境で確認し、CIが緑になっていることを確認してからリリースタグを作成してください。", pageId: "p3" },
  { id: "f4", question: "障害が起きたら誰に連絡すればいい？", answer: "障害対応ではまずオンコール担当に連絡し、影響範囲を切り分けます。重大障害は30分以内に経営陣へ報告してください。", pageId: "p4" },
];

export const GUIDELINES: GuidelineSection[] = [
  { id: "g1", title: "書く前に確認すること", body: "似た内容のページがすでにないか、検索やカテゴリの一覧で確認してください。同じテーマのページが増えると、どれが最新か分からなくなります。近いページがある場合は、新規作成ではなく既存ページの編集や子ページ追加を検討してください。" },
  { id: "g2", title: "タイトルの付け方", body: "「まとめ」「メモ」のような曖昧なタイトルは避け、内容が一目で分かる具体的な名前にしてください。例：「経費精算のやり方」「デプロイ手順書」。日付が意味を持つ場合（議事録など）は「8/25 定例MTG議事録」のように日付を入れます。" },
  { id: "g3", title: "カテゴリ・タグ・階層の使い分け", body: "カテゴリは部署単位の固定分類です。同じ部署の中でテーマ別に細かく分けたい場合は、ページの下に子ページを追加してください（3階層まで推奨）。タグは部署をまたいで横断的に探したいキーワード（例：ルール、手順書）に使います。" },
  { id: "g4", title: "本文の書き方（Markdown）", body: "見出しは `##`、太字は `**太字**`、箇条書きは `- 項目`、コードは `` `コード` ``、コードブロックは ```` ``` ```` で囲みます。編集画面の「プレビュー」タブで見た目を確認してから保存してください。" },
  { id: "g5", title: "非公開設定について", body: "人事情報や取引先情報など、所属部署以外に見せたくない内容は「非公開設定」を必ずオンにしてください。公開範囲は部署単位です。個人だけに公開する機能は今のところありません。" },
  { id: "g6", title: "保存から公開までの流れ", body: "ほとんどのカテゴリでは「保存して公開する」を押すとすぐに内容が反映されます。内容は変更履歴に残るので、間違えてもすぐに元に戻せます。「全社共通」など承認制のカテゴリのみ、公開前に管理者の承認が必要です。編集を中断する場合は「下書き保存」を使うと、次に開いたときに続きから再開できます。" },
  { id: "g7", title: "更新するときの注意", body: "内容を大きく書き換える場合も、既存ページの編集で対応してください。変更内容は自動的に変更履歴に記録され、いつでも見比べられます。" },
];
