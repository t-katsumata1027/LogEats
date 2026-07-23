# Log-Eats SEO・LPO・SNSマーケティング90日ロードマップ

監査日: 2026年7月23日

## 1. 目的

Log-Eatsの無料AIカロリー・PFC解析を入口として利用者を増やし、次の順で早期収益化する。

1. A8.netアフィリエイト
2. Google AdSense
3. Amazon・楽天などのECアフィリエイト

無料フルアクセスを維持し、広告収益のために解析成功率、結果表示速度、継続率を悪化させない。

## 2. サービス全体像

Log-Eatsは次の獲得ループを持つ。

```text
検索・SNS・共有URL
  ↓
トップ／記事／広告LP
  ↓
ログイン不要の画像・テキスト解析
  ↓
カロリー・PFC結果表示
  ↓
登録／LINE連携
  ↓
初回食事記録
  ↓
履歴・グラフ・目標・再解析
  ↓
単食・一日まとめのSNS共有
  ↓
共有経由の新規流入
  ↓
関連性の高い広告・アフィリエイト
```

主要実装:

- 公開トップと無料解析: `src/app/page.tsx`、`src/components/AnalyzerClient.tsx`
- 画像解析: `src/app/api/analyze/route.ts`
- テキスト解析: `src/app/api/logs/manual/route.ts`
- 記録・継続体験: `src/components/Dashboard.tsx`、`src/components/ChatDashboard.tsx`
- LINE記録: `src/app/api/webhooks/line/route.ts`
- 共有: `src/app/share/`、`src/app/s/`
- 広告: `src/components/AffiliateBanner.tsx`、`src/components/AdBanner.tsx`
- 計測: `src/components/EventTracker.tsx`、`src/app/api/track/route.ts`

## 3. 現状の判断

ユーザー提供の直近7日スクリーンショットでは、Vercel Analyticsは訪問者972、ページビュー1,249、直帰率88%で、Google流入が912だった。一方、GA4はアクティブユーザー36、新規ユーザー33、イベント497、キーイベント0だった。

この差は「急成長」と断定する材料ではなく、次の可能性を先に解消すべき計測異常である。

- GA4同意・タグ発火・定義の差
- Botまたは不正トラフィック
- VercelとGA4のユーザー定義差
- 匿名解析やCTAのイベント欠損

現状は「流入数をさらに増やす」より、「検索エンジンが正しく巡回できる状態」と「流入から解析成功までを測れる状態」の復旧が先である。

## 4. P0リスク

### 4.1 robots.txt、sitemap.xml、ads.txtが本番404

本番確認結果:

| URL | 状態 |
|---|---:|
| `https://www.log-eats.com/robots.txt` | 404 |
| `https://www.log-eats.com/sitemap.xml` | 404 |
| `https://www.log-eats.com/ads.txt` | 404 |

原因:

- ファイルや生成コードは存在する。
- `src/middleware.ts`の公開ルートに含まれず、`.txt`と`.xml`も認証ミドルウェアの対象になる。

対策:

- `/robots.txt`、`/sitemap.xml`、`/ads.txt`を明示的に公開する。
- デプロイ後に200、Content-Type、本文をCIと本番監視で検証する。
- Search Consoleを接続し、サイトマップを送信する。

### 4.2 下層ページのcanonicalがトップを指す

`src/app/layout.tsx`のcanonical `/`が下層へ継承され、記事、ニュース、規約、プライバシーまでトップページを正規URLとして宣言している。記事タイトルもテンプレートと子タイトルの双方に`Log-Eats`が含まれ、二重化している。

対策:

- 共通layoutからcanonicalを除き、トップだけに自己canonicalを設定する。
- index対象の各ページへ自己canonical、固有OG/Twitter、URL、画像、公開日・更新日を設定する。
- タイトルのブランド名はテンプレートか子ページの片方だけにする。

### 4.3 匿名ユーザーのプロダクト計測が成立していない

- `EventTracker`は`/api/track`へ送信する。
- `/api/track`は公開ルートではない。
- `data-track`属性が実UIに付与されていない。
- GA4は基本タグだけで、解析開始・成功・失敗、登録、初回記録、広告クリックがない。
- 画像APIの匿名成功ログは成功レスポンス後にあり、到達不能になっている。

対策:

- `/api/track`を入力検証・レート制限付きで公開するか、GA4と事業イベント基盤へ統一する。
- `anonymous_id`、`session_id`、first/last touch、UTMを導入する。
- `analysis_start`、`analysis_success`、`analysis_error`を画像、テキスト、LINEで同一定義にする。
- GA4推奨イベント`sign_up`、`login`、`share`を可能な範囲で使用する。
- キーイベントは、解析成功、登録完了、初回記録、アフィリエイトクリックから選定する。

### 4.4 匿名解析結果と画像の公開・保存リスク

未登録の解析でもDB保存、公開Blob保存、共有ID発行が行われる。共有ページは認証不要で、noindex、共有失効、公開期限がない。

対策:

- 匿名解析は原則として永続保存しない。
- 共有はユーザーの明示操作でのみ作成する。
- 通常画像はprivate保存とし、必要時だけ期限付きURLを発行する。
- 共有ページは`noindex,nofollow,noarchive`を既定にする。
- 共有の失効、削除、保存期限、OGキャッシュへの注意を実装する。

### 4.5 公開AI解析APIの濫用対策がない

画像容量・MIME・寸法、テキスト長、IP・匿名ID別回数制限が不足している。AI費用増加や遅延は、利用者だけでなくクロールとSEOにも悪影響を与える。

対策:

- IPと匿名ID別のレート制限、日次上限
- 画像MIME、容量、寸法、デコード検証
- テキスト長上限、制御文字対策
- Bot対策、サーキットブレーカー、タイムアウト
- エラー率・AI費用・p95結果時間のDiscordアラート

## 5. P1リスク

### 5.1 公開SEOページが動的・no-store

RootLayoutで毎回`auth()`を実行し、公開トップでも再び`auth()`を実行している。本番公開ページは`private, no-cache, no-store`で、トップHTMLは約235KB、単発TTFBは約0.43秒だった。

また、日本語フォントの多数のwoff2がpreloadされている。

対策:

- 公開SEO領域と認証アプリ領域をroute groupとlayoutで分離する。
- 公開記事は静的生成またはISRにする。
- 認証UIは専用layoutまたはクライアント境界へ移す。
- 日本語フォントのweight、preload、fallback、利用範囲を見直す。
- Lighthouseと実測CWVに性能予算を設定する。

### 5.2 構造化データと可視本文の不一致

トップにFAQPageとHowToのJSON-LDがあるが、同じFAQ本文が画面上に存在しない。構造化データは可視コンテンツと一致させる。

対策:

- 可視FAQ・利用手順を追加してJSON-LDと同期するか、不一致のマークアップを削除する。
- WebApplication、Organization、WebSite、Articleを実体に合わせる。
- Rich Results Test相当の検証をCIへ追加する。

### 5.3 YMYL領域の信頼情報が不足

カロリー・PFCは健康に関わるため、検索品質と利用者の信頼の両面で以下が必要である。

- 計算方法
- データソース
- 推定精度と限界
- AIが苦手な食事
- 更新日・変更履歴
- 運営者・執筆者
- 専門家が確認した場合のみ、確認者と範囲

「栄養士監修」「高精度」「必ず痩せる」などは、事実と根拠なしに使用しない。日本食品標準成分表の所管表記も一次情報で修正する。

### 5.4 広告HTMLとセキュリティ

DBから取得した広告HTMLを`dangerouslySetInnerHTML`で挿入しており、許可タグ・属性・リンク先の制限がない。改ざん時にはSEOスパムや保存型XSSにつながる。

対策:

- A8の許可済みリンクを構造化データとして保存し、HTMLを直接保存しない方式へ移行する。
- 移行までsanitize、リンク先allowlist、`rel="sponsored noopener noreferrer"`を強制する。
- CSP、X-Content-Type-Options、Referrer-Policy、Permissions-Policyを設定する。

### 5.5 AdSenseとプライバシーの不整合

- AdSenseスクリプトは環境変数がなくても本番IDのfallbackで読み込まれる。
- `ads.txt`は本番404。
- プライバシーポリシーにはGA4、AdSense、アフィリエイト、Cookie、保存期間、削除方法の説明が不足している。

対策:

- 承認・設定・必要な同意が揃った場合だけAdSenseを読み込む。
- 広告とアフィリエイトの関係を明確に表示する。
- ポリシーを実装と一致させ、必要に応じて法務・専門家レビューを受ける。

## 6. UX・LPO監査

### 良い点

- 未登録で解析を試せる価値が明確
- 画像とテキストの両方を提供
- LINE、履歴、グラフ、再解析まで継続価値がある
- 共有ページから「自分も試す」への獲得ループがある

### 改善優先度が高い点

1. ファーストビューにLINE、その他ログイン、PWA追加、無料解析が並び、最重要行動が分散している。
2. モバイル初回表示でPWA固定バナーとインラインカードが重複し、解析UIを覆う。
3. 固定PWAバナーのアイコンが文字化けしている。
4. 「まず解析する」と「登録する」の順序が視覚的に逆転しやすい。
5. A8バナーは案件と利用文脈の関連性、表示、クリック、成果を測れない。

LPO方針:

- トップの主CTAを「無料で写真解析」に統一する。
- LINE登録とPWA追加は解析成功後の次行動としてテストする。
- 初回セッションではPWA固定バナーを表示せず、解析成功または再訪時に表示する。
- 1回の実験で変更する変数は1つにする。
- 成功指標をクリック率だけでなく`analysis_success`と登録後初回記録まで追う。

## 7. コンテンツSEO戦略

### 基本方針

Googleのpeople-first方針に合わせ、検索語の微差だけでAI記事を量産しない。各ページは最低1つの独自価値を持つ。

- Log-Eatsの実画面・実測
- 独自の匿名集計
- 解析が当たる例・外れる例
- 運営者の一次経験
- 公的一次資料を用いた独自解説
- 実使用した商品の比較・検証

### 初期クラスタ

1. 写真カロリー計算
   - 写真からカロリーを計算する仕組み
   - 精度、誤差、撮影のコツ
2. PFC入門
   - PFCの意味と結果画面の読み方
   - 目標値は個人差があることを明示
3. コンビニ・外食・自炊
   - 栄養成分ラベルがある場合
   - 盛り付けや量で誤差が出る場合
4. 食事記録の継続
   - 写真、テキスト、LINEの使い分け
5. プロダクト透明性
   - 計算ロジック、データソース、限界、更新履歴
6. 収益ページ
   - 商品の一次使用、比較基準、向く人・向かない人、広告表示

### 内部リンク

```text
記事ハブ
  ├─ 基礎解説
  ├─ 食事タイプ別ガイド
  ├─ 解析精度・限界
  ├─ 商品比較・広告LP
  └─ 無料解析CTA
```

記事から解析へのCTA、解析結果から関連解説へのリンク、比較記事から案件LPへのリンクを計測する。

## 8. 90日ロードマップ

### Phase 0: 0〜3日 — クロールと安全性の復旧

- robots.txt、sitemap.xml、ads.txtを200へ
- canonical、タイトル二重化、固有OGを修正
- `/api/track`と匿名解析イベントを修正
- 匿名画像の自動公開を停止し、共有ページをnoindexへ
- 公開AI APIへ上限とレート制限
- Search Console接続

完了条件:

- 主要公開URLのHTTP、canonical、robots、sitemapテストがCIと本番で成功
- GA4 DebugViewで解析開始・成功・失敗が確認できる
- 匿名解析だけでは公開共有URLが作られない

### Phase 1: 4〜10日 — 計測基盤

- `anonymous_id`、`session_id`、UTM、first/last touch
- 解析、登録、初回記録、共有、広告イベント
- GA4キーイベント
- GSC、GA4、Vercel、A8の朝報データ統合
- Discord毎朝7時レポート

完了条件:

- 新規訪問から解析成功、登録、初回記録、広告クリックまで日次集計できる
- VercelとGA4の差分理由を説明できる

### Phase 2: 2〜4週 — SEO基盤と最初の収益ページ

- 公開領域を静的・ISR化
- 計算方法、データソース、精度と限界、運営者ページ
- 記事テンプレート、Article構造化データ、パンくず
- 検索意図クラスタ3本と収益LP1〜2本
- A8案件を3〜5件に絞り、案件・配置別に計測

完了条件:

- GSCで有効ページとクエリが取得できる
- 記事から解析成功への転換を測れる
- 最初のアフィリエイト発生を案件・配置へ帰属できる

### Phase 3: 3〜6週 — 人物型AI広報とSNS獲得

- AI広報の名称、プロフィール、固定投稿、運用規約
- Xを主軸、Instagram Reelsを副軸として開始
- 実画面デモ6本、基礎解説4本、透明性投稿2本
- 全リンクへUTMとcreative_id
- 初期30日間は人間承認後に公開

完了条件:

- SNS起点の解析成功ユーザーを投稿単位で測れる
- 広告表示漏れ、無根拠な健康表現、無断素材利用が0件

### Phase 4: 7〜12週 — 勝ち筋拡張

- 週次で勝ちコンテンツを別フックへ展開
- AdSense申請・導入判断
- Amazon・楽天の比較記事とデータフィード方針
- 低リスク投稿だけ予約投稿まで自動化
- SEO記事、LP、SNSを同じ検索意図・ファネルで統合

完了条件:

- 収益チャネル別の利益、EPC、RPMを把握できる
- 広告導入後も解析成功率、速度、継続率が許容範囲内

## 9. 毎朝Discordレポート

表示順:

1. 前日収益、オーガニッククリック、新規ユーザー、解析成功、登録、食事記録ユーザー
2. 獲得: チャネル、ランディングページ、SNS投稿
3. 利用: 解析開始、成功、失敗、成功率、画像対テキスト、匿名対ログイン
4. 価値到達: 登録、LINE連携、初回記録
5. 継続: DAU、WAU、MAU、D1、D7、D28
6. SEO: 表示、クリック、CTR、順位、クロール異常
7. LPO・収益: LP、CTA、案件別CTR、EPC、承認売上、RPM
8. SNS: 投稿別リーチ、保存、共有、リンク、解析成功、登録
9. 本日の最大ボトルネック、実行する1タスク、承認待ち

自動停止条件:

- robots、sitemap、主要LPが4xx/5xx
- 解析開始または成功が0
- 解析成功率が7日基準より相対10%以上悪化
- 広告表示漏れ、無根拠な健康効果、個人情報、無断素材
- GA4イベント、UTM、投稿IDの欠損

## 10. 公式参考資料

- Google Search: [Helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- Google Search: [Spam policies / thin affiliation](https://developers.google.com/search/docs/essentials/spam-policies)
- Google Search: [robots.txt](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt)
- Google Search: [Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- Google Search: [Structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- Google Analytics: [Recommended events](https://support.google.com/analytics/answer/9267735)
- 消費者庁: [景品表示法とステルスマーケティング](https://www.caa.go.jp/policies/policy/representation/fair_labeling)

