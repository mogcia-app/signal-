# Sentry 使い方ガイド

## 📊 ダッシュボードの基本操作

### 主要な画面

#### 1. エラー一覧（Issues）
**URL**: `mogcia.sentry.io/issues/`

- **確認できること**:
  - すべてのエラーが一覧表示
  - エラーの種類、発生回数、影響を受けたユーザー数
  - エラーが未解決か解決済みか

- **使い方**:
  - 各エラーをクリックして詳細を確認
  - フィルターで検索（プロジェクト、環境、期間など）
  - 「割り当て」でチームメンバーにアサイン

#### 2. ダッシュボード（Dashboard）
**URL**: `mogcia.sentry.io/dashboard/default-overview/`

- **確認できること**:
  - エラー数の推移グラフ
  - 影響を受けたユーザー数
  - 国別・ブラウザ別の統計
  - トランザクションのパフォーマンス

- **使い方**:
  - 全体の状況を把握
  - 期間を変更して（14D、30Dなど）推移を確認
  - フィルターで特定のプロジェクトや環境を絞り込む

#### 3. 探索（Explore / Discover）
**URL**: `mogcia.sentry.io/discover/`

- **確認できること**:
  - より詳細なデータ分析
  - カスタムクエリでデータを検索
  - 特定の条件でフィルタリング

#### 4. 設定（Settings）
**URL**: `mogcia.sentry.io/settings/`

- **設定項目**:
  - プロジェクト設定
  - アラート設定
  - チームメンバー管理
  - 環境変数の確認

---

## 🔍 エラーの詳細確認方法

### エラーをクリックすると表示される情報

1. **Overview（概要）**
   - エラータイトル
   - 発生回数
   - 影響を受けたユーザー数
   - 最初に発生・最後に発生した時刻

2. **Stacktrace（スタックトレース）**
   - エラーが発生した行番号
   - ファイル名と関数名
   - 呼び出し履歴

3. **Breadcrumbs（パンくずリスト）**
   - エラー発生までの操作履歴
   - クリック、ナビゲーション、APIコールなど

4. **User（ユーザー情報）**
   - エラーを発生させたユーザーの情報
   - IPアドレス、ブラウザ、OS

5. **Tags（タグ）**
   - 環境、コンポーネント、ブラウザなど

---

## 📧 アラート設定方法

### 新規エラー発生時に通知

1. **Settings** → **Projects** → **javascript-nextjs** を選択
2. **Alerts** → **Create Alert Rule**
3. 以下の条件を設定：

```
Conditions:
- Issue created/updated
- When: "New issue"

Actions:
- Send email notification
- Slack通知（設定済みの場合）
```

### エラー数が一定数を超えたら通知

```
Conditions:
- Issue frequency is above X events
- Time window: 1 hour
- Threshold: 5 events

Actions:
- Send email
- Create Slack message
```

---

## 🏷️ エラーの管理方法

### エラーに状態を付ける

#### 状態の種類
- **Unresolved（未解決）**: 修正が必要なエラー
- **Resolved（解決済み）**: 修正が完了したエラー
- **Ignored（無視）**: 無視するエラー

#### 状態の変更方法
エラーをクリック → 右上の「Resolve」ボタン

### エラーに割り当てる
エラーの詳細ページで：
1. 「Assign」をクリック
2. 担当者を選択
3. コメントで状況を共有

### エラーを無視する
1. エラーの詳細ページで「Ignore」をクリック
2. 理由を選択：
   - "This error is coming from browser extensions"
   - "This error happens in old browsers"
   - "This error is not relevant to my app"

---

## 🎯 実用的な使い方

### 朝一番にチェックすること

1. **ダッシュボードにアクセス**
2. **新規エラーを確認** → 「問題」でフィルタ：「新規」
3. **優先度の高いエラーを確認** → 優先度：High
4. **影響範囲を確認** → ユーザー数が多いもの

### エラー対応の流れ

```
1. エラーを発見
   ↓
2. エラーをクリックして詳細確認
   ↓
3. スタックトレースで原因を特定
   ↓
4. コードを修正
   ↓
5. デプロイ
   ↓
6. Sentryで「Resolve」にマーク
   ↓
7. 再発しないか監視
```

### よくあるエラーパターン

#### 1. ReferenceError
```
undefinedFunction is not defined
```
**原因**: 関数が定義されていない
**対処**: 関数名のタイポやインポート漏れを確認

#### 2. TypeError
```
Cannot read properties of null
```
**原因**: nullやundefinedのプロパティにアクセス
**対処**: nullチェックを追加

#### 3. Network Error
```
Failed to fetch
```
**原因**: APIコールが失敗
**対処**: ネットワーク接続、APIの状態を確認

---

## 💡 便利な機能

### 1. リリース追跡
- デプロイ後にエラーが増えたか確認
- どのリリースでエラーが発生したか追跡

### 2. ユーザー報告
- ユーザーがエラーを報告する機能
- フィードバック付きでエラーを報告

### 3. パフォーマンス監視
- ページの読み込み速度
- スロークエリの検出
- トランザクションの分析

### 4. セッションリプレイ
- ユーザーの操作を記録
- エラー発生時の状況を映像で確認

---

## 🔍 検索・フィルタリング

### よく使うフィルター
- **is:unresolved** - 未解決のエラーのみ
- **environment:production** - 本番環境のみ
- **level:error** - エラーレベルのみ
- **has:user** - ユーザー情報があるもののみ

### 検索例
```
is:unresolved environment:production level:error
```
→ 本番環境の未解決のエラーのみ表示

---

## 📊 レポート機能

### 週次レポート
1. Settings → Projects → Reports
2. 自動で週次レポートをメール送信
3. エラー数の推移、解決率などを確認

### ダッシュボードのカスタマイズ
1. ダッシュボードで「Edit Dashboard」
2. 必要なウィジェットを追加
3. 独自のメトリクスを表示

---

## 🎓 実践的なチュートリアル

### シナリオ1: 新規エラーが発生した
1. **Slackやメールで通知を受ける**
2. **Sentryダッシュボードにアクセス**
3. **エラーの詳細を確認** → スタックトレース、ユーザー情報
4. **再現手順を確認** → Breadcrumbsで操作履歴を追跡
5. **コードを修正**
6. **Resolveボタンでマーク**

### シナリオ2: ユーザーから「エラーが出た」と報告を受けた
1. **SentryでそのユーザーのIDを検索**
2. **過去のエラーを確認** → 同じ問題が過去にも発生していないか
3. **新しいエラーなら詳細を確認**
4. **フィードバックを送ったユーザーに連絡**

### シナリオ3: デプロイ後にエラーが急増
1. **ダッシュボードでリリースごとのエラー数を確認**
2. **どのリリースで増えたかを特定**
3. **そのリリースの変更内容を確認**
4. **関連するエラーを一括で解決**

---

## ⚙️ 高度な設定

### 1. エラーを無視する設定
**sentry.client.config.ts**で設定：
```typescript
ignoreErrors: [
  'ResizeObserver loop limit exceeded',
  '特定のエラーメッセージ',
]
```

### 2. 特定の情報をマスク
```typescript
beforeSend(event) {
  // 個人情報をマスク
  if (event.user) {
    delete event.user.email;
  }
  return event;
}
```

### 3. パフォーマンス監視の調整
```typescript
tracesSampleRate: 0.1, // 10%のみサンプリング
```

---

## 🆘 トラブルシューティング

### エラーが記録されない
- DSNが正しく設定されているか確認
- `enabled: true` になっているか確認
- ブラウザのコンソールでネットワークエラーがないか確認

### エラーが多すぎる
- `ignoreErrors`で不要なエラーを除外
- 同じエラーを自動でグループ化

### デプロイ後もエラーが表示される
- キャッシュをクリア
- ブラウザのリロード
- Sentryのグループ解除を確認

---

## 📚 参考リンク

- [Sentry公式ドキュメント](https://docs.sentry.io/)
- [Next.js Sentry統合](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [エラー監視のベストプラクティス](https://docs.sentry.io/product/issues/)

