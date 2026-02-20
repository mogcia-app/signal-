# Admin運用指示書: AI出力回数制限（basic / standard / pro）

## 1. 目的
- ユーザーに付与するプランに応じて、AI出力回数上限を正しく適用する。
- 問い合わせ時に、上限・残回数の確認を短時間で行う。

---

## 2. 現在の上限ルール
- `basic`: 月10回
- `standard`: 月20回
- `pro`: 月50回

対象機能（共通カウント）:
- AI投稿文生成
- 投稿チャットβ
- 分析チャットβ
- 月次レポート「再提案する」

---

## 3. Admin側の設定項目
Firestore `users/{uid}` の `planTier` を設定する。

```ts
planTier: "basic" | "standard" | "pro"
```

注意:
- 旧値 `ume / take / matsu` は互換動作するが、新規設定では使わない。

---

## 4. 付与手順（運用）
1. 対象ユーザーの `users/{uid}` を開く。  
2. `planTier` を以下いずれかに設定:
   - `basic`
   - `standard`
   - `pro`
3. 保存する。  
4. ユーザーに再ログインまたは画面リロードを案内する。  

---

## 5. 反映確認（サポート対応）
ユーザー画面で以下を確認:
- HomeのAI生成エリア
- 投稿チャットβ
- 分析チャットβ
- 月次レポート再提案ボタン付近

表示される「今月のAI残回数」がプラン相当になっているか確認する。

---

## 6. 問い合わせテンプレ
### A. 「上限に達した」と言われた場合
1. 当月の利用実績を確認（`ai_output_usage_monthly/{uid_YYYY-MM}`）。  
2. `count` が上限以上か確認。  
3. 必要なら `planTier` を見直し。  

### B. 「プランを変更したのに反映されない」
1. `users/{uid}.planTier` が `basic/standard/pro` になっているか確認。  
2. クライアント再読み込み後に再確認。  
3. それでも不整合なら当月利用ドキュメントを確認。  

---

## 7. 禁止事項
- `planTier` に `basic/standard/pro` 以外の新規値を入れない。  
- 手動で `ai_output_usage_monthly.count` を直接改ざんしない（監査対象）。  

---

## 8. 参考（実装ファイル）
- 上限判定ロジック: `/Users/marina/Desktop/signal/src/lib/server/ai-usage-limit.ts`
- プラン正規化ロジック: `/Users/marina/Desktop/signal/src/lib/plan-access.ts`
- 残回数API: `/Users/marina/Desktop/signal/src/app/api/ai/usage-summary/route.ts`
