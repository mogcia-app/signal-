# Signal ツール利用ガイド

Signal は Instagram の運用を AI とデータで自動化するためのハブです。本ドキュメントでは、主要機能と典型的な使い方をまとめます。個別の実装観点ではなく「ツールをどう使うか」にフォーカスしています。

---

## 1. 全体像

| 区分 | 目的 | 主な画面/機能 |
| --- | --- | --- |
| **Lab** | 投稿作成・A/B テスト・AI 提案の採用 | `/instagram/lab/feed`, `/instagram/lab/reel`, `/instagram/lab/story` |
| **Analytics** | 投稿の実績入力と AI 分析 | `/analytics/feed`, `/instagram/analytics/reel` |
| **Monthly Report** | KPI コンソール + AI インサイト + 翌月アクション | `/instagram/monthly-report` |
| **Learning Dashboard** | 学習バッジ・パターン学習・アクションログ | `/learning` |
| **Plan** | 運用計画、AI 戦略、シミュレーション | `/instagram/plan` |

---

## 2. ワークフロー（推奨手順）

1. **投稿を Lab で作成**
   - プロンプトを入力して AI 案を生成（`AI提案ハイライト` カード）。
   - Snapshot 参照や Master Context を確認しながら編集。
   - 必要に応じて A/B テストを登録し、想定 KPI や仮説を保存。

2. **投稿公開後、Analytics で実績を入力**
   - `投稿分析データ` セクションに likes/reach/saves などを入力。
   - Gender/age のオーディエンス構成も入力。
   - 保存前に `AI分析（投稿まとめ）` をチェックして傾向を把握。

3. **Monthly Report で集計**
   - `AIインサイト` タブで Post Deep Dive、Persona、A/B 結果、Next Month Actions を確認。
   - `KPIコンソール` タブで KPI Drilldown、Time Slot Heatmap、Audience Breakdown を参照。
   - 「翌月フォーカスアクション」のチェックボックスをオン/オフしてアクションログに反映。

4. **Learning Dashboard で継続学習**
   - Gold/Red シグナルや成功/改善ギャラリーをチェック。
   - Post Deep Dive の「次のアクション」チェックボックスで実行状況を記録。
   - バッジ進捗、RAG 参照、Master Context 情報を定期的にレビュー。

---

## 3. 画面別のポイント

### Lab
- **AI Context**: `AI提案ハイライト` や `AI参照データ` バッジから、参照された学習データや Master Context を確認。
- **Snapshot Insights**: ゴールド/ネガティブ投稿の構造タグ、A/B テスト結果、CTA などをカードで表示。
- **A/B テスト**: カタログからプリセット登録、カスタム登録ボタン、結果入力モーダルまで UI が統合済み。

### Analytics
- **Feed**: 大幅にシンプル化。入力フォームの直下に AI まとめを表示し、保存前に確認できる。
- **Reel**: 同様にフォーム内に AI まとめを配置。再生時間は「時:分:秒」入力対応。

### Monthly Report
- **AI インサイトタブ**: Persona Highlights、A/B サマリー、Feedback Sentiment、Post Deep Dive、Learning Reference、Next Month Actions を縦に表示。
- **KPI コンソールタブ**: KPI Drilldown、Time Slot Heatmap（平均 ER 説明付き）、Content Performance（Feed/Reel の 2 カラム + 折りたたみ）、Audience Breakdown（Feed/Reel 別に Pie + Bar）。
- **UI ユースケース**: `現在の運用計画`、`フィード/リール統計サマリー` は折りたたみ可能。`AIまとめ` 配下に「過去のAIサマリー」を配置。

### Learning Dashboard
- **学習リファレンス**: Master Context や参照データを `LearningReferenceCard` で共通表示。
- **Success/Improvement Gallery**: 単色ベースで落ち着いたカード。成功パターンはアクセントライン + バッジ。
- **アクションログ**: 次のアクションや月次フォーカスにチェックボックスを付与し、即時 `actionLogs` に反映。

---

## 4. AI 連携の基本

| 項目 | 概要 |
| --- | --- |
| **共通レスポンス** | すべての `monthly-analysis`, `post-generation`, `monthly-report-summary` などは `AIGenerationResponse` を返す。 |
| **buildAIContext** | ユーザープロファイル、最新プラン、スナップショット、Master Context、アクションログ、A/B テストを束ねるユーティリティ。`generation.references` に流すことで Lab/Monthly に表示できる。 |
| **Master Context** | 学習フェーズ、RAG ヒット率、フィードバック好感度、達成バッジなどを保持。`getLearningPhaseLabel` で日本語化。 |
| **Action Logs** | `actionLogsApi` 経由で Lab・Monthly・Learning から共通更新。実行済み/未実行の状態や最終更新日をバッジ表示。 |

---

## 5. データ入力の注意

- **engagement**: `likes + comments + shares + saves (+ reposts for reels)` の独自計算。Monthly Report の KPI Drilldown で明示。
- **Reel Play Time**: 「時・分・秒」入力 → 秒に変換して保存。
- **Audience Breakdown**: Feed/Reel 別に gender (%), age (%) を入力することで Monthly Report の Pie/Bar に反映。
- **投稿削除**: `/instagram/posts` で削除すると Monthly Summary からも連動して除去されるよう整備済み。

---

## 6. よくある QA

| 質問 | 回答 |
| --- | --- |
| AI 出力は自動？ | `/learning` や Monthly ではバックエンドで AI を即時計算しており、別途ボタンは不要です。 |
| A/B テストの流れ？ | カタログ→登録→結果入力→Monthly Report でサマリー表示→Snapshot カードにもタグ表示。 |
| KPI コンソール名称？ | 旧「数字ダッシュボード」から改称済み。 |
| 総エンゲージメントの定義？ | 上記独自ロジック。Monthly Report の KPI Drilldown の Engagement カードに説明を表示。 |

---

## 7. 参考

- 技術的な詳細（LLM パイプライン、RAG、API 設計など）は `docs/dev/LLM_CONTENT_PIPELINE.md` を参照。
- バグ対応や lint 方針は `docs/dev/POSTMORTEM_*.md`, `docs/dev/LINT_FIX_PLAN.md` を参照。

---

## 8. アピールポイント（差別化要素）

| 切り口 | Signal の特徴 | 他社ツールとの違い |
| --- | --- | --- |
| **AI コンテキストの深さ** | `buildAIContext` で Master Context、学習バッジ、フィードバック、アクションログ、A/B 結果までまとめて参照させる。Lab/Monthly のバッジで「どの学習データを参照したか」を可視化。 | 一般的な AI ライティングツールは単発プロンプトで応答するだけで、参照データの出典が不透明になりがち。 |
| **アクションログ連携** | 学習ダッシュボード・月次レポート・Lab のアクションが同じ `actionLogs` に記録され、AI 解析が「実行済み/未実行」や効果メモを即参照。 | 従来はレポートとタスク管理が別アプリになり、AI 解析にアクション履歴が反映されない。Signal ではタスク完了→次回解析 まで自動ループ。 |
| **A/B テスト統合** | カタログ登録→結果入力→Snapshot→Monthly Report まで UI・API を共通化。勝者バッジや KPI 差分が Post Deep Dive にも反映。 | A/B テストを別システムで管理すると、レポートや投稿分析と紐付かず、学びが埋もれがち。Signal は投稿カードから直接結果を辿れる。 |
| **KPI 分解と AI インサイトの共存** | `KPIコンソール` で数値のドリルダウンを、`AIインサイト` でストーリーや Next Action を同一画面に整理。Persona, Heatmap, Sentiment, Deep Dive をタブ切り替えなしで俯瞰。 | 多くのツールは「数値中心」か「AI コメント中心」に二極化しがち。Signal は同じレポートで両方を連動表示。 |
| **構造タグ & NLP** | 投稿本文から `structureTags`, CTA 種類, intro style などを抽出し、Gold/Red 投稿や Post Deep Dive に表示。AI 生成時の参照にも利用。 | 一般的な Instagram ツールは定量指標のみ。Signal はテキスト構造の特徴量まで扱うため、次の案出しがしやすい。 |
| **Persona & Audience 分解** | Feed/Reel 個別に Gender/Age Pie・Bar を可視化し、月次レポートや Lab のスナップショットとリンク。 | オーディエンス分析は Instagram Insights まかせで、レポートには簡略表示のみ、というケースが多い。Signal は独自入力→月次集計で「誰に響いたか」を保持。 |
| **エンゲージメント算出ポリシー明示** | `likes + comments + shares + saves (+ reposts)` の独自ロジックを KPI Drilldown 内で明記。 | 他社では Instagram API 既定値のままか、算出式が不透明。Signal は社内定義を文書化し、説明責任を果たせる。 |

---

このガイドは利用観点を中心にしています。細かい UI 仕様やコンポーネント構造を変更した場合は適宜更新してください。

