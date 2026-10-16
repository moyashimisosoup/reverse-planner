# Reverse Planner

期限・終了時刻から逆算して、行動の計画・実行・振り返り・再計画を支援するプロジェクト。

> Status: **Web prototype v0.1 公開中**（2026-10-17）。GitHub ActionsでテストとPages配信に成功し、公開ページ・アセットのHTTP 200を確認しています。iPhone等の実機操作は未検証です。

## Web試作版 v0.1

- **公開URL**：https://yama-books.github.io/reverse-planner/
- [デプロイ実行記録（成功）](https://github.com/yama-books/reverse-planner/actions/runs/38941776421) / [ワークフロー](.github/workflows/deploy-pages.yml)
- [HTML](index.html) / [表示スタイル](assets/app.css) / [アプリの操作](assets/app.js) / [共通計算エンジン](assets/core.mjs)
- [試作版の操作方法・制限](docs/prototype-v0.1.md)
- [計算エンジンのテスト](tests/core.test.mjs)（Node.js 18以降で `node --test tests/core.test.mjs`）

**使い方**：「くらし／まなび」を選択し、「時刻から逆算／日付から逆算」を切り替える。作業を追加・編集・完了すると、残り時間とタイムラインが再計算されます。「開始」からタスクタイマーも利用できます（時刻モードのみ）。

**保存**：計画はブラウザ内のローカルストレージに保存されます。別端末との同期、復元用JSON読み込み、学習の習得判定はまだありません。実在する学生の氏名・成績などをリポジトリへ登録しないでください。

**GitHub Pages公開**：`Settings → Pages → Build and deployment → GitHub Actions` を使用。`main` のアプリ関連ファイル変更でテスト・デプロイを自動実行します。詳細は [公開運用記録](docs/deployment.md)。

## 何を作るか

- **くらし**: 出発準備、家事、仕事、旅行など。日時・作業時間・順番・固定予定を踏まえて逆算する。
- **まなび**: 宿題、定期テスト、受験など。課題量・提出期限だけでなく、復習・想起練習・理解の確認を扱う。
- **共通エンジン**: 目標、タスク、制約、見積もり、実績、再計画を統一モデルで扱う。

利用者向け画面は別々に最適化できる構成を目指す。将来的な統合ホーム画面も選択肢に残す。

## 既存アプリとの関係

既存の [しゅくだいノート](https://github.com/moyashimisosoup/shukudai-notebook) は維持する。このリポジトリで独立した共通エンジンを設計・検証し、互換性・データ保全を確認してから学習機能を連携する。現時点で既存アプリに変更は加えていない。

## 資料の入り口

| 分類 | ファイル | 内容 |
| --- | --- | --- |
| 構想 | [docs/concept.md](docs/concept.md) | 目的、利用場面、成功条件 |
| 設計 | [docs/architecture.md](docs/architecture.md) | コンポーネントと境界 |
| 要件 | [docs/requirements.md](docs/requirements.md) | 必須機能・品質条件 |
| 決定 | [docs/decisions.md](docs/decisions.md) | 設計判断の記録 |
| 研究 | [research/README.md](research/README.md) | 論文・証拠の管理方法 |
| 出典一覧 | [research/sources.csv](research/sources.csv) | 文献の書誌情報・確認状況 |
| エビデンス | [research/evidence-matrix.csv](research/evidence-matrix.csv) | 研究と候補機能の対応 |
| 仕様 | [specs/planning-engine.md](specs/planning-engine.md) | 逆算・再計画 |
| 日常 | [specs/daily-planner.md](specs/daily-planner.md) | 日常生活のUI・ユースケース |
| 学習 | [specs/study-planner.md](specs/study-planner.md) | 宿題アプリとの連携と試験対策 |
| 行動支援 | [specs/behavior-support.md](specs/behavior-support.md) | 実行支援の条件分岐 |
| 実施計画 | [roadmap.md](roadmap.md) | 段階的な進め方 |

## 研究・プロダクトの原則

1. **根拠の強い方法を優先**する。最小行動への分解は選択肢の一つであり、全員に強制しない。
2. **「完了」と「習得」を分ける**。学習時間や提出物の消化だけで理解度を推定しない。
3. **利用者が主導**する。固定予定、休息、締切、難易度の調整を勝手に変更しない。
4. **失敗を責めない**。予定が崩れた場合は不足時間を知らせ、選べる再計画を示す。
5. **プライバシーを守る**。公開リポジトリに児童・生徒の実データ、APIキー等を登録しない。
6. **研究と仮説を区別**する。外部研究の効果量をアプリ固有の効果として主張しない。

## 公開とライセンス

ソースと設計の閲覧を目的にPublicで管理する。現時点ではライセンス未選定で、リポジトリがPublicであることは再利用の包括的な許可を意味しない。コードの再利用条件は実装・公開方針とともに後日決める。

開発状況：**v0.1公開済み**。固定予定・依存関係・学習の復習計画などは後続開発。実機操作テストは未実施。
