# GitHub Pages デプロイ記録

最終確認：2026-10-17（JST）

- **リポジトリ正本**: https://github.com/yama-books/reverse-planner
- **公開URL**: https://yama-books.github.io/reverse-planner/
- **公開方式**: Settings → Pages → Source: GitHub Actions
- **ワークフロー**: `.github/workflows/deploy-pages.yml`
- **初回成功実行**: https://github.com/yama-books/reverse-planner/actions/runs/38941776421
- **実行対象コミット**: `8766fbe0f30c60612afc17fdece0b1fef9a7a5c7`
- **実行結果**: `completed / success`。テスト、静的サイト構築、アップロード、Pagesデプロイの各ステップが成功。
- **外部確認**: 公開URLのHTML・`assets/app.js`・`assets/core.mjs`がHTTP 200。表示文言がv0.1に一致。

## 公開対象

`index.html`, `assets/app.css`, `assets/app.js`, `assets/core.mjs` と `.nojekyll` だけを `_site/` に集めてアップロードする。設計・研究文書、テスト、環境変数や未作成の利用者データはPagesの配信物に含めない。

## 自動実行条件

`main` の `index.html`, `assets/**`, `tests/**`, ワークフロー自身の更新時に実行する。Actionsタブから `workflow_dispatch` による手動実行も可能。設計文書だけの変更はサイトを更新しないため、自動デプロイしない。

## 再配信・トラブル対応

1. https://github.com/yama-books/reverse-planner/actions/workflows/deploy-pages.yml で最新の実行結果を確認。
2. `Test reverse-planning engine` で失敗したら、配信せずにテストを修正する。
3. `Configure Pages` / `Deploy to GitHub Pages` の失敗はPagesの公開ソース、Actions権限、`github-pages`環境の保護ルールを確認。
4. `Settings → Pages` に公開URLとGitHub Actionsが表示されているか確認。
5. 実行成功後に公開URLとJS/CSSを確認。可能ならiPhone Safari・デスクトップChromeの操作検証も行う。

## 検証範囲

GitHub Actionsと公開URLの取得結果は確認済み。ただしiPhone等の実機のスクリーン表示、操作、端末内保存は現時点では未検証。公開成功と実機動作確認は別のマイルストーンとして管理する。
