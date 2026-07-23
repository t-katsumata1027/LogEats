import assert from "node:assert/strict";

const baseUrl = (process.env.SEO_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.log-eats.com").replace(/\/+$/, "");
const publicPages = ["/", "/news", "/privacy", "/terms", "/how-it-works"];
const maxHtmlBytes = 300 * 1024;

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  const body = await response.text();
  return { response, body };
}

function getCanonical(html) {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return match?.[1] ?? null;
}

function getTitle(html) {
  return html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? null;
}

function normalizeUrl(url) {
  const parsed = new URL(url);
  return parsed.pathname === "/" ? parsed.origin : `${parsed.origin}${parsed.pathname}`;
}

for (const path of publicPages) {
  const { response, body } = await fetchText(path);
  assert.equal(response.status, 200, `${path} はHTTP 200である必要があります`);
  assert.match(response.headers.get("content-type") || "", /text\/html/i, `${path} はHTMLを返す必要があります`);
  assert.ok(Buffer.byteLength(body, "utf8") <= maxHtmlBytes, `${path} のHTMLが性能予算を超えています`);
  assert.equal(normalizeUrl(getCanonical(body) || ""), normalizeUrl(`${siteUrl}${path}`), `${path} のcanonicalが自己URLと一致しません`);

  const title = getTitle(body);
  assert.ok(title && title.length > 0, `${path} にtitleがありません`);
  assert.ok(!/Log-Eats\s*\|.*\|\s*Log-Eats/i.test(title), `${path} のtitleにブランド名の重複があります`);
}

const { response: robotsResponse, body: robots } = await fetchText("/robots.txt");
assert.equal(robotsResponse.status, 200, "robots.txt はHTTP 200である必要があります");
assert.match(robots, new RegExp(`Sitemap:\\s*${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sitemap\\.xml`, "i"), "robots.txt のSitemap行が不正です");

const { response: sitemapResponse, body: sitemap } = await fetchText("/sitemap.xml");
assert.equal(sitemapResponse.status, 200, "sitemap.xml はHTTP 200である必要があります");
for (const path of publicPages) {
  assert.match(sitemap, new RegExp(`${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${path === "/" ? "/" : path}`), `sitemap.xml に ${path} がありません`);
}

const { response: adsResponse, body: ads } = await fetchText("/ads.txt");
assert.equal(adsResponse.status, 200, "ads.txt はHTTP 200である必要があります");
assert.ok(ads.trim().length > 0, "ads.txt が空です");

const { body: homeHtml } = await fetchText("/");
assert.match(homeHtml, /application\/ld\+json/i, "トップページにJSON-LDがありません");
assert.match(homeHtml, /画像解析の精度はどのくらいですか？/u, "FAQの可視本文がありません");
assert.match(homeHtml, /Log-Eatsの使い方/u, "HowToの可視本文がありません");

console.log("SEO回帰テスト: 全ケース成功");
