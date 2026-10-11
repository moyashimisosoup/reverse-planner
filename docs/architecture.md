# アーキテクチャ初期案（v0.1）

更新：2026-10-12。未実装の計画であり、実際の構成を保証するものではない。

## 役割の分離

1. **Core**：純粋関数を中心とした日時・作業量・優先順位・制約・逆算・再計画。日常／学習のどちらにも依存しない。
2. **Daily app**：家事、出発、仕事などの入力・可視化・タイマー。
3. **Study adapter / UI**：教科、試験範囲、提出物、復習・想起練習、習得の確認。
4. **Persistence**：初期は利用者端末上の保存を検討。同期は別設計とし、既存アプリの保存形式を直接変更しない。

## 想定ディレクトリ（実装時）

    packages/core/         # 型・計画アルゴリズム・検証・テスト
    apps/daily/            # 汎用Web/PWA
    apps/study/            # 将来必要な場合に追加
    adapters/shukudai/     # しゅくだいノート連携を隔離

現時点ではディレクトリや実装は未作成。

## 共通ドメイン

| 概念 | 主なフィールド（案） |
| --- | --- |
| Goal | id, title, dueAt, timezone, outcomeCriteria |
| Task | id, goalId, estimateMinutes, remainingUnits, prerequisites, optional |
| Availability | date, availableWindows, restWindows, fixedEvents |
| PlanItem | taskId, plannedStart, plannedEnd, state, version |
| Actual | itemId, startedAt, endedAt, completedUnits, notes |
| Constraint | type, hardOrSoft, priority, value |

日時はタイムゾーンを含めて保持し、表示は利用者のローカル時間とする。日単位の学習可能量と分単位の開始終了時間を混同しない。

## 公開API（案）

- validatePlanInput(): タスク・締切・時間帯・依存関係の検証。
- generatePlan(): 制約を守った計画候補＋未配置の作業＋不可能な理由。
- replan(): 実績・中断・固定予定を反映した新バージョンの提案。
- summarizePlan(): 今日、今週、締切までの進捗を同じ基準で集計。

## 設計ガードレール

- 固定予定と明示的休息を無断で動かさない。
- 期限が物理的に不可能な場合、黙ってタスクを省略せず不足を表示。
- 同じ入力・バージョンから再現可能な決定的な計算とテストを優先。
- 学習固有の習得度推定はCoreに埋め込まない。
- 外部同期・通知・共有は権限とプライバシー設計の後に追加。

関連：../specs/planning-engine.md
