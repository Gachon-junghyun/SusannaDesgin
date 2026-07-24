import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: { path: string; priority: number; freq: "weekly" | "monthly" | "yearly" }[] =
    [
      { path: "", priority: 1, freq: "weekly" },
      { path: "/quote", priority: 0.9, freq: "monthly" },
      { path: "/signs", priority: 0.8, freq: "monthly" },
      { path: "/works", priority: 0.8, freq: "weekly" },
      { path: "/process", priority: 0.7, freq: "monthly" },
      { path: "/about", priority: 0.7, freq: "monthly" },
      { path: "/support", priority: 0.6, freq: "monthly" },
      { path: "/privacy", priority: 0.2, freq: "yearly" },
      { path: "/terms", priority: 0.2, freq: "yearly" },
      { path: "/no-email-collect", priority: 0.1, freq: "yearly" },
    ];
  // ※ /admin 은 절대 넣지 않습니다 (robots.txt 와 noindex 로도 막고 있습니다)

  return routes.map((r) => ({
    url: `${site.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
