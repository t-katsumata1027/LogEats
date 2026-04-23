# 食事カロリー推定

食事の写真をアップロードすると、**概算の摂取カロリー**と**栄養素**（タンパク質・脂質・炭水化物）を算出するWebアプリです。

## 機能

- 食事の写真をアップロード
- AI（Google Gemini または OpenAI）で写っている料理・食品を認識
- 食品ごとのカロリー・栄養素を表示し、合計を算出
- **`learned_foods`**: 
  解析結果の精度と速度を決定づけるマスターDBです。
  現在、**「日本食品標準成分表2023（八訂）」および「主要コンビニ3社の公式製品データ」計3,500件以上**がプリセットされており、市販品や基本食材に対しては極めて高い精度を誇ります。
  さらに、解析のたびに新規食品が自動学習され、データベースが成長していく仕組みになっています。
- **LINE連携**: LINE Botに食事の写真を送信するだけで自動で解析・記録（アカウント連携時）
- **高精度解析**: パッケージの「栄養成分表示」をAIが直接読み取り、公式数値を優先的に採用するロジックを搭載
- **大規模食品DB**: 日本食品標準成分表（八訂）およびコンビニ3社の最新データ（計3,500件超）を標準搭載し、市販品の解析精度を大幅に向上

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

## 解析ロジック

```mermaid
loop 食品（foods）ごとに繰り返し
    alt 栄養成分表示（label_nutrition）が抽出された場合
        System->>System: AI推計・DB検索をバイパスし、ラベルの値を採用
    else ラベルなし
        System->>DB: `learned_foods` に学習済み食品があるか検索(`lookupFoodMasterWithLearned`)
        alt 未学習（DBに存在しない）
            System->>AI: 【推論フェーズ2】成分推定プロンプト（食品名・分量）送信
            AI-->>System: 100gあたりのPFCカロリー、推定グラム数
            System->>DB: `learned_foods` に新規結果を保存
        else 学習済み
            DB-->>System: 過去の推定値を返す
        end
    end
    
    System->>System: 分量の補正（ユーザー指定のグラム/mlがあればAI推定グラムを上書き）
    System->>System: （グラム数 / 100）を乗算して総成分量を算出
    System->>System: PFCからAtwater係数で総カロリーを逆算・検算
end
```

## 注意

- 算出結果は**あくまで目安**です。実際の摂取量は調理法・盛り付け量により異なります。
- 画像認識の精度により、検出されない食品や誤認識がある場合があります。
