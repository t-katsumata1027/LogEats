# 食事カロリー推定

食事の写真をアップロードすると、**概算の摂取カロリー**と**栄養素**（タンパク質・脂質・炭水化物）を算出するWebアプリです。

## 機能

- 食事の写真をアップロード
- AI（Google Gemini または OpenAI）で写っている料理・食品を認識
- 食品ごとのカロリー・栄養素を表示し、合計を算出
- **未登録の食品**は AI で栄養を推定し、データベース（Vercel Postgres）の `learned_foods` テーブルに自動保存。次回からはその学習済みデータを利用してAPIコストを削減
- **LINE連携**: LINE Botに食事の写真を送信するだけで自動で解析・記録（アカウント連携時）

## 必要な環境

- Node.js 18+
- **API キー（どちらか一方）**
  - **Google Gemini**… [Google AI Studio](https://aistudio.google.com/apikey) で取得
  - OpenAI … [OpenAI API Keys](https://platform.openai.com/api-keys) で取得（有料クレジット必要）

## セットアップ

1. 依存関係をインストール

```bash
npm install
```

2. 環境変数を設定

`.env.example` をコピーして `.env.local` を作成し、**GEMINI_API_KEY または OPENAI_API_KEY のどちらか**を設定してください。無料で使う場合は **GEMINI_API_KEY** がおすすめです。

```bash
cp .env.example .env.local
# 無料で使う場合: GEMINI_API_KEY= に Google AI Studio のキーを記入
# または: OPENAI_API_KEY= に OpenAI のキーを記入
```

3. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて利用できます。

## 技術構成 (アーキテクチャ)

- **フロントエンド / フレームワーク**: Next.js 15 (App Router), React 19, Tailwind CSS, DaisyUI
- **認証**: Clerk（ログイン、ユーザー管理、LINE連携）
- **データベース**: Vercel Postgres（`users`, `meal_logs`, `learned_foods` など）
- **ストレージ**: Vercel Blob（食事画像の保存）
- **画像認識・栄養データ補完**: Google Gemini (gemini-3.1-flash-lite-preview) または OpenAI (gpt-4o-mini Vision)
- **外部連携**: LINE Bot SDK (LINEからの画像投稿・解析レスポンス機能)

## 注意

- 算出結果は**あくまで目安**です。実際の摂取量は調理法・盛り付け量により異なります。
- 画像認識の精度により、検出されない食品や誤認識がある場合があります。
