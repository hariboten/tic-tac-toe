# エージェント評価機能の仕様

## 用語
- **評価バッチ**: 単一の設定で実行される複数対戦のまとまり。
- **マッチアップ**: 2エージェント間の対戦カード。
- **ベースライン**: 比較基準として保存された過去評価結果。

## 入出力仕様

### 入力パラメータ
- `agents: AgentType[]`
- `gamesPerMatchup: number`
- `seed: number`
- `mode: 'quick' | 'standard' | 'full'`
- `compareWithBaseline?: boolean`

### 出力フォーマット（概略）
```json
{
  "meta": {
    "seed": 42,
    "gamesPerMatchup": 1000,
    "generatedAt": "2026-01-01T00:00:00.000Z"
  },
  "matchups": [
    {
      "pair": "MINIMAX_vs_Q_LEARNING",
      "xWins": 420,
      "oWins": 380,
      "draws": 200,
      "avgPly": 6.4
    }
  ],
  "leaderboard": [
    {
      "agent": "MINIMAX",
      "winRate": 0.61,
      "drawRate": 0.22
    }
  ]
}
```

## 判定ロジック
- 対戦結果は `X_WIN / O_WIN / DRAW` の3値で記録。
- 勝率は `wins / totalGames` で算出。
- ベースライン比較時、以下条件で warning:
  - `current.winRate - baseline.winRate <= -0.03`

## エラー仕様
- パラメータ不正（局数<=0、agents不足）は即時エラー。
- 対戦途中の例外は当該マッチアップ失敗として記録し、他カードは継続。
- 出力保存失敗時は終了コード非0で返す。

## 互換性要件
- 既存 `TicTacToeAgent` インターフェースを変更しない。
- 評価機能は既存ゲーム進行ロジックを再利用し、重複実装を避ける。

## 受け入れ基準
1. 同一seedで2回実行した結果JSONが一致する。
2. 4種類以上のエージェントで総当たり評価が完走する。
3. ベースライン差分が閾値を超えた場合に警告を出す。
4. 主要指標がMarkdownサマリーに整形される。
