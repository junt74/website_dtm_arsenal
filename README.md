# website_dtm_arsenal

DTM所有プラグインを一覧・検索・フラッシュカードで確認するためのWebアプリです。

## Tech stack

- Bun
- Vite
- TypeScript
- Vanilla DOM / CSS
- Ajv
- Vitest
- Biome
- Google Apps Script（予定: Google SheetsからJSON配信）
- GitHub Pages

## Development

```bash
bun install
bun run dev
```

## Quality checks

```bash
bun run test
bun run lint
bun run build
```

## GitHub Pages

`main` ブランチへのpushで `.github/workflows/deploy-pages.yml` が実行され、`dist/` がGitHub Pagesへデプロイされます。

Viteのbase pathは次のリポジトリPages URL向けに設定済みです。

```text
https://junt74.github.io/website_dtm_arsenal/
```

GitHubリポジトリ側では **Settings > Pages > Build and deployment > Source** を **GitHub Actions** に設定してください。

## Initial scope

- 所有プラグイン一覧
- フラッシュカード
- 今後: GASからの一括JSON取得
- 今後: 検索・カテゴリ絞り込み
- 今後: 学習状態のLocalStorage保存

詳細仕様は `dtm_plugin_database_webapp_spec.md` を参照してください。
