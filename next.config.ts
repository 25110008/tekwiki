import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// ローカルの`next dev`からもCloudflareのD1/KVバインディングにアクセスできるようにする。
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
