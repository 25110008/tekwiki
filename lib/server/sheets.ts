// Google スプレッドシートを簡易DBとして読み書きするクライアント。
// サービスアカウント認証(JWT)をWeb Crypto APIで自前実装している。
// これはNode.jsとCloudflare Workersの両方でそのまま動く(googleapis等のNode専用SDKに依存しないため)。
// サーバー専用。秘密鍵を扱うので、クライアントコンポーネントから直接importしないこと。

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive";

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of u8) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKeyRaw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY が設定されていません");
  }
  const privateKeyPem = privateKeyRaw.includes("\\n") ? privateKeyRaw.replace(/\\n/g, "\n") : privateKeyRaw;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const claimB64 = base64url(encoder.encode(JSON.stringify(claimSet)));
  const unsigned = `${headerB64}.${claimB64}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google認証トークンの取得に失敗しました (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

function spreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error("GOOGLE_SPREADSHEET_ID が設定されていません");
  return id;
}

async function sheetsFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(`${SHEETS_API}/${spreadsheetId()}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Google Sheets APIエラー (${res.status}): ${await res.text()}`);
  }
  return res;
}

export type SheetRow = string[];

// シート名(例:"Pages")のヘッダー行+全行を取得し、ヘッダーをキーにしたオブジェクトの配列で返す。
export async function readSheet(sheetName: string): Promise<Record<string, string>[]> {
  const res = await sheetsFetch(`/values/${encodeURIComponent(sheetName)}`);
  const data = (await res.json()) as { values?: SheetRow[] };
  const rows = data.values ?? [];
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  return body
    .filter((row) => row.some((cell) => cell !== undefined && cell !== ""))
    .map((row) => {
      const obj: Record<string, string> = {};
      header.forEach((key, i) => {
        obj[key] = row[i] ?? "";
      });
      return obj;
    });
}

// ヘッダー行の並びを読み取る(書き込み時に列順を合わせるため)。
export async function readHeader(sheetName: string): Promise<string[]> {
  const res = await sheetsFetch(`/values/${encodeURIComponent(sheetName)}!1:1`);
  const data = (await res.json()) as { values?: SheetRow[] };
  return data.values?.[0] ?? [];
}

// 指定したオブジェクトを1行として末尾に追加する。ヘッダーに存在する列だけを書き込む。
export async function appendRow(sheetName: string, row: Record<string, string | number | boolean>): Promise<void> {
  const header = await readHeader(sheetName);
  const values = [header.map((key) => String(row[key] ?? ""))];
  await sheetsFetch(
    `/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values }) }
  );
}

// idColumn(例:"id")の値がidValueと一致する行を、patchの内容で上書きする(部分更新)。
export async function updateRowById(
  sheetName: string,
  idColumn: string,
  idValue: string,
  patch: Record<string, string | number | boolean>
): Promise<boolean> {
  const header = await readHeader(sheetName);
  const res = await sheetsFetch(`/values/${encodeURIComponent(sheetName)}`);
  const data = (await res.json()) as { values?: SheetRow[] };
  const rows = data.values ?? [];
  const idIdx = header.indexOf(idColumn);
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[idIdx] === idValue);
  if (rowIndex === -1) return false;

  const current = rows[rowIndex];
  const merged = header.map((key, i) => (key in patch ? String(patch[key]) : current[i] ?? ""));
  const rangeRow = rowIndex + 1; // 1-indexed, ヘッダーが1行目
  await sheetsFetch(`/values/${encodeURIComponent(sheetName)}!A${rangeRow}:${colLetter(header.length)}${rangeRow}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [merged] }),
  });
  return true;
}

// idColumnの値がidValueと一致する行を削除する。
export async function deleteRowById(sheetName: string, idColumn: string, idValue: string): Promise<boolean> {
  const sheetId = await getSheetIdByName(sheetName);
  const header = await readHeader(sheetName);
  const res = await sheetsFetch(`/values/${encodeURIComponent(sheetName)}`);
  const data = (await res.json()) as { values?: SheetRow[] };
  const rows = data.values ?? [];
  const idIdx = header.indexOf(idColumn);
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[idIdx] === idValue);
  if (rowIndex === -1) return false;

  await sheetsFetch(`:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 },
          },
        },
      ],
    }),
  });
  return true;
}

const sheetIdCache = new Map<string, number>();
async function getSheetIdByName(sheetName: string): Promise<number> {
  if (sheetIdCache.has(sheetName)) return sheetIdCache.get(sheetName)!;
  const res = await sheetsFetch(`?fields=sheets.properties`);
  const data = (await res.json()) as { sheets: { properties: { sheetId: number; title: string } }[] };
  for (const s of data.sheets) sheetIdCache.set(s.properties.title, s.properties.sheetId);
  const id = sheetIdCache.get(sheetName);
  if (id === undefined) throw new Error(`シート「${sheetName}」が見つかりません`);
  return id;
}

function colLetter(n: number): string {
  let s = "";
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

// 内部の一括セットアップ用(シートの作成・ヘッダー書き込み・全行書き込み)。
export async function ensureSheetWithRows(sheetName: string, header: string[], rows: (string | number | boolean)[][]): Promise<void> {
  await ensureSheetExists(sheetName);
  const values = [header, ...rows.map((r) => r.map(String))];
  await sheetsFetch(`/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values }),
  });
}

async function ensureSheetExists(sheetName: string): Promise<void> {
  const res = await sheetsFetch(`?fields=sheets.properties.title`);
  const data = (await res.json()) as { sheets: { properties: { title: string } }[] };
  if (data.sheets.some((s) => s.properties.title === sheetName)) return;
  await sheetsFetch(`:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }),
  });
}
