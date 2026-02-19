# エージェント評価機能のコード設計

## 設計方針
- 既存の対戦ロジックを再利用し、評価専用コードは「実行」「集計」「出力」に限定する。
- 依存性注入で乱数・時刻・出力先を差し替え可能にする。
- 小さなモジュール分割でテスト容易性を確保する。

## 想定モジュール構成
- `src/app/evaluation/agent-evaluator.ts`
  - 公開API `runEvaluation(config)` のオーケストレーター。
- `src/app/evaluation/matchup-runner.ts`
  - 指定カードをN局実行し、生結果を返す。
- `src/app/evaluation/metrics-calculator.ts`
  - 勝率・引き分け率・平均手数を計算。
- `src/app/evaluation/baseline-comparator.ts`
  - ベースラインとの差分判定。
- `src/app/evaluation/report-writer.ts`
  - JSON/Markdown の整形と保存。
- `src/app/evaluation/types.ts`
  - `EvaluationConfig`, `MatchupResult`, `LeaderboardEntry` など。

## インターフェース案
```ts
export interface EvaluationConfig {
  agents: AgentType[];
  gamesPerMatchup: number;
  seed: number;
  mode: 'quick' | 'standard' | 'full';
  compareWithBaseline?: boolean;
}

export interface AgentEvaluator {
  runEvaluation(config: EvaluationConfig): Promise<EvaluationReport>;
}
```

## データフロー
1. `AgentEvaluator` が設定を検証。
2. 全マッチアップを生成（先手後手反転を含む）。
3. `MatchupRunner` が結果イベント列を返却。
4. `MetricsCalculator` が集計を実施。
5. `BaselineComparator` が差分を評価。
6. `ReportWriter` が成果物を保存。

## テスト設計
- ユニットテスト:
  - `metrics-calculator`: 集計計算の正しさ。
  - `baseline-comparator`: 閾値判定境界。
- 統合テスト:
  - 固定seedで評価結果が再現すること。
  - 2〜3エージェントで実行し、レポートが生成されること。

## 実装順
1. `types.ts` と `metrics-calculator.ts` を先行実装。
2. `matchup-runner.ts` を既存ロジック接続で実装。
3. `agent-evaluator.ts` で統合。
4. `report-writer.ts` / `baseline-comparator.ts` を追加。
5. 最後にCLIエントリポイントを追加。
