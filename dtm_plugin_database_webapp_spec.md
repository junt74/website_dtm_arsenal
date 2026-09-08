# DTM 所有プラグイン検索・フラッシュカード Webアプリ 仕様書

-   作成日: 2026-09-08
-   文書バージョン: 1.0
-   想定構成: TypeScript + Vite + Google Apps Script + Google Sheets
-   データ原本: Google Sheets「DTM
    所有プラグインリスト」→「所有プラグイン」シート

## 1. 目的

Google Sheetsで管理している所有DTMプラグイン情報を、Google Apps
Script（GAS）経由でWebアプリ起動時に一括取得し、ブラウザ側で高速に検索・絞り込み・ソート・閲覧できるWebアプリを構築する。

初期版では「所有プラグインを思い出す・探す」ための検索データベースを中核とし、同一データを利用したフラッシュカード機能も提供する。

Google Sheetsを Single Source of
Truth（唯一の編集元）とし、Webアプリ側ではプラグインマスターデータを原則編集しない。

------------------------------------------------------------------------

## 2. 基本方針

### 2.1 アーキテクチャ

``` text
Google Sheets
「DTM 所有プラグインリスト」
        │
        │ SpreadsheetApp
        ▼
Google Apps Script
  buildPluginDatabase()
        │
        │ doGet() / JSON
        ▼
Webアプリ起動時に fetch
        │
        ▼
PluginRepository
        │
        ├── 検索
        ├── 絞り込み
        ├── ソート
        ├── 詳細表示
        └── フラッシュカード
```

GASは検索APIにはしない。起動時に全件を一括取得し、その後の検索・ソート・フィルタリングはクライアント側で行う。

### 2.2 責務分担

  レイヤー                   責務
  -------------------------- ------------------------------------------------------
  Google Sheets              プラグイン情報の編集・管理
  GAS                        Sheet読み込み、正規化、JSON生成、配信
  Webアプリ                  データ取得、キャッシュ、検索、表示、フラッシュカード
  LocalStorage / IndexedDB   ユーザー固有の学習状態・UI状態等の保存
  `plugins.schema.json`      GASから返すJSON形式の契約

------------------------------------------------------------------------

## 3. 対象データ

初期版では「所有プラグイン」シートの以下の6項目を対象とする。

  Sheet列名        JSONプロパティ   用途
  ---------------- ---------------- ----------------------------
  `developer`      `developer`      メーカー名
  `ProductName`    `productName`    製品名
  `MainCategory`   `mainCategory`   大分類
  `SubCategory`    `subCategory`    小分類
  `概要`           `summary`        製品概要
  `使い方`         `usage`          所有環境での利用方法・メモ

初期版ではPCMグルーヴTierなど別シートの情報は統合しない。必要になった時点でスキーマを拡張する。

------------------------------------------------------------------------

## 4. JSONデータ仕様

### 4.1 APIレスポンス

``` json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-09-08T10:00:00.000Z",
  "source": {
    "spreadsheet": "DTM 所有プラグインリスト",
    "sheet": "所有プラグイン"
  },
  "plugins": [
    {
      "id": "air-music-tech-flavor-pro",
      "developer": "AIR Music Tech",
      "productName": "Flavor Pro",
      "mainCategory": "エフェクター",
      "subCategory": "マルチエフェクト",
      "summary": "レコード、テープ、チューブなどの質感を再現するLo-Fiエフェクト。",
      "usage": ""
    }
  ]
}
```

### 4.2 Plugin型

``` typescript
export interface Plugin {
  id: string;
  developer: string;
  productName: string;
  mainCategory: string;
  subCategory: string;
  summary: string;
  usage: string;
}

export interface PluginDatabase {
  schemaVersion: string;
  generatedAt: string;
  source: {
    spreadsheet: string;
    sheet: string;
  };
  plugins: Plugin[];
}
```

### 4.3 ID

`id` はフラッシュカードの学習状態等と紐付ける永続キーとして利用する。

基本生成規則:

``` text
developer + "-" + productName
↓
NFKD正規化
↓
小文字化
↓
英数字以外を "-"
↓
連続区切り等を整理
```

例:

``` text
AIR Music Tech + Flavor Pro
→ air-music-tech-flavor-pro
```

#### IDに関する制約

-   同じプラグインについて再取得しても同じIDになること。
-   表示順や行番号をIDに使用しない。
-   重複IDを検出した場合、GAS側でエラーとして扱えるようにする。
-   将来メーカー名・製品名の表記変更が頻発する場合は、Sheet側に明示的な固定ID列を追加することを検討する。

------------------------------------------------------------------------

## 5. `plugins.schema.json`

JSON Schema Draft 2020-12を採用する。

``` json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "plugins.schema.json",
  "title": "DTM Plugin Database",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "generatedAt",
    "source",
    "plugins"
  ],
  "properties": {
    "schemaVersion": {
      "type": "string"
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "source": {
      "type": "object",
      "additionalProperties": false,
      "required": ["spreadsheet", "sheet"],
      "properties": {
        "spreadsheet": {
          "type": "string"
        },
        "sheet": {
          "type": "string"
        }
      }
    },
    "plugins": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/plugin"
      }
    }
  },
  "$defs": {
    "plugin": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "developer",
        "productName",
        "mainCategory",
        "subCategory",
        "summary",
        "usage"
      ],
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1
        },
        "developer": {
          "type": "string"
        },
        "productName": {
          "type": "string",
          "minLength": 1
        },
        "mainCategory": {
          "type": "string"
        },
        "subCategory": {
          "type": "string"
        },
        "summary": {
          "type": "string"
        },
        "usage": {
          "type": "string"
        }
      }
    }
  }
}
```

------------------------------------------------------------------------

## 6. GAS仕様

### 6.1 公開方式

GASをWebアプリとしてデプロイし、`doGet()` がJSONを返す。

### 6.2 GAS内部構造

最低限、以下の責務に分離する。

``` text
doGet()
 └── buildPluginDatabase()
      ├── readPluginSheet()
      ├── normalizePlugin()
      ├── makePluginId()
      └── validatePlugins()
```

`doGet()` 自体にSheet変換ロジックを書き込まない。

### 6.3 基本実装

``` javascript
const SPREADSHEET_ID = '対象Spreadsheet ID';
const SHEET_NAME = '所有プラグイン';
const SCHEMA_VERSION = '1.0.0';

function doGet() {
  try {
    const database = buildPluginDatabase();

    return ContentService
      .createTextOutput(JSON.stringify(database))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: true,
        message: String(error)
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function buildPluginDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
  }

  const values = sheet.getDataRange().getValues();

  if (values.length === 0) {
    throw new Error('Plugin sheet is empty');
  }

  const [header, ...rows] = values;

  const columns = Object.fromEntries(
    header.map((name, index) => [String(name).trim(), index])
  );

  const requiredColumns = [
    'developer',
    'ProductName',
    'MainCategory',
    'SubCategory',
    '概要',
    '使い方'
  ];

  for (const column of requiredColumns) {
    if (!(column in columns)) {
      throw new Error(`Required column not found: ${column}`);
    }
  }

  const plugins = rows
    .filter(row => stringValue(row[columns.ProductName]) !== '')
    .map(row => normalizePlugin(row, columns));

  validatePlugins(plugins);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: {
      spreadsheet: ss.getName(),
      sheet: SHEET_NAME
    },
    plugins
  };
}

function normalizePlugin(row, columns) {
  const developer = stringValue(row[columns.developer]);
  const productName = stringValue(row[columns.ProductName]);

  return {
    id: makePluginId(developer, productName),
    developer,
    productName,
    mainCategory: stringValue(row[columns.MainCategory]),
    subCategory: stringValue(row[columns.SubCategory]),
    summary: stringValue(row[columns['概要']]),
    usage: stringValue(row[columns['使い方']])
  };
}

function stringValue(value) {
  return value == null ? '' : String(value).trim();
}

function makePluginId(developer, productName) {
  return `${developer}-${productName}`
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validatePlugins(plugins) {
  const ids = new Set();

  for (const plugin of plugins) {
    if (!plugin.id) {
      throw new Error(`Plugin ID is empty: ${plugin.productName}`);
    }

    if (ids.has(plugin.id)) {
      throw new Error(`Duplicate plugin ID: ${plugin.id}`);
    }

    ids.add(plugin.id);
  }
}
```

------------------------------------------------------------------------

## 7. Webアプリ仕様

### 7.1 技術スタック

初期案:

-   TypeScript
-   Vite
-   HTML / CSS
-   Fetch API
-   必要に応じて Fuse.js
-   LocalStorage または IndexedDB
-   PWA化は後付け可能な構造にする

UIフレームワークは必須としない。

### 7.2 起動フロー

``` text
App Start
  │
  ├─ 1. キャッシュ確認
  │
  ├─ 2. GAS APIへfetch
  │
  ├─ 3. HTTP/JSON検証
  │
  ├─ 4. schemaVersion確認
  │
  ├─ 5. PluginRepositoryへ格納
  │
  ├─ 6. 最新データをキャッシュ
  │
  └─ 7. UI表示
```

ネットワーク取得に失敗し、有効なキャッシュが存在する場合はキャッシュから起動する。

### 7.3 データ取得

``` typescript
export async function fetchPluginDatabase(
  url: string
): Promise<PluginDatabase> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Plugin API error: ${response.status}`);
  }

  const data: unknown = await response.json();

  // 実装時にはschema validationを行う。
  return data as PluginDatabase;
}
```

GAS URLはソースへ直接ハードコードせず、Viteの環境変数から指定する。

``` text
VITE_PLUGIN_API_URL=https://script.google.com/macros/s/.../exec
```

------------------------------------------------------------------------

## 8. PluginRepository

取得した配列をUIから直接操作するのではなく、検索・ソートの責務をRepositoryへまとめる。

``` typescript
export class PluginRepository {
  constructor(private readonly plugins: readonly Plugin[]) {}

  getAll(): readonly Plugin[] {
    return this.plugins;
  }

  findById(id: string): Plugin | undefined {
    return this.plugins.find(plugin => plugin.id === id);
  }

  getDevelopers(): string[] {
    return [...new Set(this.plugins.map(p => p.developer))]
      .sort((a, b) => a.localeCompare(b));
  }

  getMainCategories(): string[] {
    return [...new Set(this.plugins.map(p => p.mainCategory))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }
}
```

UI、フラッシュカード、将来の別画面は同じRepositoryを利用する。

------------------------------------------------------------------------

## 9. 検索仕様

### 9.1 検索対象

初期版では以下を全文検索対象とする。

1.  `productName`
2.  `developer`
3.  `mainCategory`
4.  `subCategory`
5.  `summary`
6.  `usage`

### 9.2 基本検索

最低限、入力文字列を小文字化し、各対象フィールドに部分一致するものを返す。

検索例:

``` text
reverb
Roland
Lo-Fi
コンプレッサー
ボーカル
ドラム
```

### 9.3 Fuse.js

初期データ量では単純な `includes()` でも十分である。

曖昧検索が必要になった場合のみFuse.jsを導入する。

Fuse.js導入時の検索重みの初期案:

  項目             Weight
  -------------- --------
  productName        0.30
  developer          0.20
  subCategory        0.15
  mainCategory       0.10
  summary            0.15
  usage              0.10

### 9.4 絞り込み

以下を独立したフィルタとして提供する。

-   Developer
-   MainCategory
-   SubCategory

検索語とフィルタはAND条件で組み合わせる。

例:

``` text
検索語: vintage
MainCategory: エフェクター
SubCategory: コンプレッサー
```

### 9.5 ソート

最低限、以下を用意する。

-   製品名 A→Z
-   製品名 Z→A
-   Developer A→Z
-   Developer Z→A
-   MainCategory
-   SubCategory

デフォルトは `Developer A→Z` → `ProductName A→Z` とする。

------------------------------------------------------------------------

## 10. 検索画面

### 10.1 レイアウト

``` text
┌────────────────────────────────────┐
│ 所有プラグイン検索                 │
├────────────────────────────────────┤
│ [ 検索........................ ]   │
│                                    │
│ Developer      [ All ▼ ]           │
│ Main Category  [ All ▼ ]           │
│ Sub Category   [ All ▼ ]           │
│ Sort           [ Developer A-Z ▼ ] │
├────────────────────────────────────┤
│ 325 plugins / 12 results           │
├────────────────────────────────────┤
│ AIR Music Tech                     │
│ Flavor Pro                         │
│ エフェクター > マルチエフェクト   │
│ レコード、テープ...               │
│                         [詳細]     │
├────────────────────────────────────┤
│ ...                                │
└────────────────────────────────────┘
```

### 10.2 詳細表示

プラグインを選択すると以下を表示する。

-   ProductName
-   Developer
-   MainCategory
-   SubCategory
-   概要
-   使い方

モバイルではモーダルまたは詳細画面、デスクトップではサイドパネル方式も許容する。

------------------------------------------------------------------------

## 11. フラッシュカード機能

### 11.1 目的

「このプラグインは何だったか」「どの用途に使えるか」を所有者自身が思い出すための学習モード。

### 11.2 基本カード

表:

``` text
Flavor Pro
AIR Music Tech

これは何をするプラグイン？
```

裏:

``` text
エフェクター > マルチエフェクト

レコード、テープ、チューブなどの質感を
再現するLo-Fiエフェクト。

[使い方]
...
```

### 11.3 出題条件

検索・フィルタ結果をそのままカードデッキとして利用できるようにする。

例:

``` text
Developer = Full Bucket Music
→ Full Bucket Music所有製品だけで復習

MainCategory = エフェクター
→ エフェクトだけで復習
```

### 11.4 学習状態

プラグイン本体データとは分離してローカル保存する。

``` typescript
export interface FlashcardProgress {
  pluginId: string;
  level: number;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt: string | null;
}
```

これによりGoogle
Sheetsのマスターデータ更新で学習履歴が消えないようにする。

------------------------------------------------------------------------

## 12. キャッシュ仕様

### 12.1 方針

起動時は最新データ取得を試みるが、ネットワーク障害時にも前回取得データで利用可能にする。

### 12.2 保存対象

``` typescript
interface PluginCache {
  cachedAt: string;
  database: PluginDatabase;
}
```

### 12.3 起動時アルゴリズム

``` text
1. ローカルキャッシュを読む
2. GAS fetch開始
3-A. fetch成功
     → 最新データでRepository生成
     → キャッシュ更新
3-B. fetch失敗
     → 有効なキャッシュあり
       → キャッシュで起動
     → キャッシュなし
       → エラー画面
```

### 12.4 初期実装

初期版はLocalStorageでもよい。

データ量増加、PWAオフライン対応、複数データセット対応へ進んだ場合はIndexedDBへ移行する。

------------------------------------------------------------------------

## 13. エラー処理

### GAS側

以下を検出する。

-   対象Spreadsheetを開けない
-   対象Sheetがない
-   必須列がない
-   ProductNameが空
-   ID生成失敗
-   ID重複

### クライアント側

以下を区別する。

-   ネットワークエラー
-   HTTPエラー
-   JSON parseエラー
-   schemaVersion非対応
-   JSON schema不正
-   キャッシュなし

ユーザーには技術的スタックトレースではなく、復旧方法を示す。

例:

``` text
最新のプラグイン一覧を取得できませんでした。
前回取得したデータを使用しています。

最終取得: 2026-09-08 18:42
```

------------------------------------------------------------------------

## 14. セキュリティ

Webアプリから直接Google Sheets APIを呼び出さない。

``` text
Browser
  ↓
GAS Web App
  ↓
Google Sheets
```

とする。

GAS公開設定は、所有プラグイン情報を公開情報として扱ってよいかを確認して決定する。

APIレスポンスには以下を含めない。

-   Spreadsheet ID
-   Googleアカウント情報
-   GAS内部設定
-   不要なSheet
-   個人情報
-   APIキー等の秘密情報

`source.spreadsheet` は表示名のみとする。

------------------------------------------------------------------------

## 15. パフォーマンス

本アプリでは全件一括取得を基本とする。

数百～数千件程度のプラグイン情報はクライアント側検索で処理する。

検索入力については必要に応じて100～200ms程度のdebounceを入れる。

以下は初期版では実装しない。

-   サーバーサイド検索
-   ページ単位API
-   GraphQL
-   SQLデータベース
-   Elasticsearch等の検索サーバー

必要性が生じるまでは構成を単純に保つ。

------------------------------------------------------------------------

## 16. ディレクトリ構成案

``` text
plugin-database/
├── public/
├── src/
│   ├── api/
│   │   └── pluginApi.ts
│   ├── domain/
│   │   ├── Plugin.ts
│   │   ├── PluginDatabase.ts
│   │   └── FlashcardProgress.ts
│   ├── repositories/
│   │   └── PluginRepository.ts
│   ├── services/
│   │   ├── PluginSearchService.ts
│   │   ├── PluginCacheService.ts
│   │   └── FlashcardService.ts
│   ├── ui/
│   │   ├── search/
│   │   ├── detail/
│   │   └── flashcard/
│   ├── app.ts
│   └── main.ts
├── schema/
│   └── plugins.schema.json
├── gas/
│   └── Code.gs
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

GASコードを同一リポジトリで管理する場合は `gas/` に置く。

------------------------------------------------------------------------

## 17. UI状態

以下はURL Query Parameterへ反映できる設計が望ましい。

``` text
?q=lofi
&developer=AudioThing
&mainCategory=エフェクター
&sort=productName
```

これにより検索状態をブックマーク・共有・ブラウザ履歴で復元できる。

フラッシュカードの学習進捗はURLには含めない。

------------------------------------------------------------------------

## 18. レスポンシブ対応

スマートフォンでの利用を主要ユースケースに含める。

最低要件:

-   片手で検索できる
-   検索欄を画面上部に固定可能
-   タップターゲットを十分に確保
-   横スクロールを原則発生させない
-   フラッシュカードはスマートフォン縦持ちで完結
-   デスクトップでは一覧性を高める

------------------------------------------------------------------------

## 19. PWA拡張

初期版完成後に以下を追加可能とする。

-   Web App Manifest
-   Service Worker
-   アプリシェルのオフラインキャッシュ
-   前回取得したプラグインDBのオフライン利用
-   ホーム画面へのインストール

プラグインマスターは起動時にGASから更新確認し、失敗時にはローカルデータへフォールバックする。

------------------------------------------------------------------------

## 20. 将来拡張

### v1.1候補

``` typescript
interface Plugin {
  // v1 fields...

  tags?: string[];
  pcmGrooveTier?: string;
}
```

### 検討可能な機能

-   PCMグルーヴTierとの統合
-   タグ検索
-   お気に入り
-   最近使ったプラグイン
-   「この用途なら何を使う？」逆引き
-   ランダムプラグイン提示
-   メーカー別フラッシュカード
-   カテゴリ別フラッシュカード
-   苦手カード優先出題
-   spaced repetition
-   全文曖昧検索
-   所有エクスパンション統合
-   未所有・購入候補DBとの横断検索
-   JSON静的エクスポート
-   GitHub Pages/PWAへの展開

------------------------------------------------------------------------

## 21. 非機能要件

### 保守性

-   Sheet列名とJSONプロパティの変換はGAS側へ集約する。
-   UIからSheet固有の列名を参照しない。
-   GAS APIとクライアントの契約はJSON Schemaで明文化する。
-   検索処理とUIを分離する。

### 可用性

-   GAS取得失敗時にキャッシュへフォールバックできる。
-   Sheet更新がなくてもWebアプリを再ビルドする必要がない。

### 移植性

将来的にGASを廃止しても、

``` text
PluginDatabase JSON
```

の契約を維持すれば、静的JSON、GitHub、Cloudflare Workers、任意のREST
API等へデータ供給元を交換できるようにする。

------------------------------------------------------------------------

## 22. MVP実装範囲

最初の完成ラインを以下とする。

### GAS

-   [ ] 「所有プラグイン」シート読込
-   [ ] 6列を正規化
-   [ ] 安定ID生成
-   [ ] 重複IDチェック
-   [ ] JSON API公開
-   [ ] `schemaVersion` 出力

### Webアプリ

-   [ ] 起動時一括fetch
-   [ ] JSON読み込み
-   [ ] Repository生成
-   [ ] 全件一覧
-   [ ] テキスト検索
-   [ ] Developerフィルタ
-   [ ] MainCategoryフィルタ
-   [ ] SubCategoryフィルタ
-   [ ] ソート
-   [ ] 詳細表示
-   [ ] ローカルキャッシュ
-   [ ] GAS取得失敗時のキャッシュフォールバック

### フラッシュカード

-   [ ] 表裏切り替え
-   [ ] 検索結果からデッキ生成
-   [ ] ランダム出題
-   [ ] 学習状態のローカル保存

------------------------------------------------------------------------

## 23. MVPでは行わないこと

以下は初期実装のスコープ外とする。

-   Google Sheetsへの書き戻し
-   ユーザー認証
-   複数ユーザー間の学習状態同期
-   サーバーサイド検索
-   AI検索
-   PCMグルーヴTier統合
-   所有エクスパンション統合
-   購入候補統合
-   高度なspaced repetition
-   GAS側の検索エンドポイント

------------------------------------------------------------------------

## 24. 完了条件

MVPは以下をすべて満たした時点で完成とする。

1.  Google Sheetsを編集すると、次回Webアプリ起動時に変更が反映される。
2.  Webアプリの再ビルドなしでマスターデータを更新できる。
3.  所有プラグインを製品名・メーカー・カテゴリ・概要・使い方から検索できる。
4.  メーカー・カテゴリによる絞り込みができる。
5.  一覧から詳細情報を確認できる。
6.  現在の検索結果をフラッシュカードの出題母集団として利用できる。
7.  GASへ接続できない場合でも、前回取得データがあればアプリを利用できる。
8.  学習状態がプラグインマスターデータとは独立して保存される。
9.  JSON形式が `plugins.schema.json` によって明文化されている。
10. 将来データ供給元をGAS以外へ交換しても、UI・検索ロジックを大幅変更せずに済む。

------------------------------------------------------------------------

## 25. 実装順序

``` text
Phase 1
plugins.schema.json策定
        ↓
Phase 2
GAS buildPluginDatabase()
        ↓
Phase 3
GAS doGet() / Web Appデプロイ
        ↓
Phase 4
TypeScript Plugin型 / Repository
        ↓
Phase 5
起動時fetch + キャッシュ
        ↓
Phase 6
検索・フィルタ・ソートUI
        ↓
Phase 7
詳細画面
        ↓
Phase 8
フラッシュカード
        ↓
Phase 9
PWA化
```

まず「Google Sheets → GAS → JSON → TypeScript
Repository」のデータパイプラインを完成させ、その後UIを構築する。
