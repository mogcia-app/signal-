# Sentry Prevent 次のステップ

## 🔍 1. GitHub Actionsの実行状況を確認

### ブラウザで確認
以下のURLにアクセスして、ワークフローの実行状況を確認してください：

**https://github.com/mogcia-app/signal-/actions**

### 確認ポイント
- ワークフローが実行中か完了しているか
- どのステップが成功/失敗しているか
- `Upload test results to Sentry Prevent` ステップが成功しているか

### エラーが発生していた場合
- エラーメッセージを確認
- ログをダウンロードして詳細を確認

---

## ⚙️ 2. Sentry APIトークンの設定（OIDC未対応の場合）

Sentry PreventがOIDCで動作しない場合は、APIトークンが必要です。

### トークンの作成
1. **Sentryにログイン**: https://mogcia.sentry.io/
2. **Settings** → **Account** → **Auth Tokens**
3. **Create New Token** をクリック
4. 名前: `Prevent CI Token`
5. Scopes: `project:releases` と `project:write` を選択
6. **Create Token** をクリック
7. 表示されたトークンをコピー（一度しか表示されません）

### GitHub Secretsに設定
1. **GitHubリポジトリ**: https://github.com/mogcia-app/signal-
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** をクリック
4. Name: `SENTRY_AUTH_TOKEN`
5. Secret: 先ほどコピーしたトークンを貼り付け
6. **Add secret** をクリック

### GitHub Actionsワークフローを更新
`.github/workflows/sentry-prevent.yml` を編集：

```yaml
- name: Upload test results to Sentry Prevent
  if: ${{ !cancelled() }}
  uses: getsentry/prevent-action@v0
  env:
    SENTRY_ORG: mogcia
    SENTRY_PROJECT: signal
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
  with:
    report-paths: |
      test-results/junit.xml
```

---

## 📊 3. Sentry Preventダッシュボードの確認

### ダッシュボードにアクセス
**https://mogcia.sentry.io/prevent/signal/**

### 確認項目
- テスト結果が表示されているか
- テストの実行時間
- 失敗率
- 不安定なテストの特定

### 結果が見えない場合
1. GitHub Actionsが正しく完了しているか確認
2. テスト結果ファイル (`test-results/junit.xml`) が生成されているか確認
3. Sentryのプロジェクト名 (`signal`) が正しいか確認

---

## 🔧 4. トラブルシューティング

### 問題: テストが実行されない
**解決策**: 
```bash
npm test
```
ローカルでテストが実行されるか確認

### 問題: JUnit XMLが生成されない
**解決策**: 
`jest.config.js` の `reporters` 設定を確認：
```javascript
reporters: [
  'default',
  ['jest-junit', {
    outputDirectory: './test-results',
    outputName: 'junit.xml',
  }],
]
```

### 問題: Sentry組織の権限エラー
**解決策**:
- OIDC設定が正しいか確認
- またはAPIトークンを使用
- 組織名 (`mogcia`) が正しいか確認

---

## ✅ 5. 動作確認の方法

### テストを追加して確認
`src/__tests__/math.test.ts` を作成：

```typescript
describe('Math operations', () => {
  test('should add two numbers', () => {
    expect(1 + 1).toBe(2);
  });

  test('should multiply two numbers', () => {
    expect(2 * 3).toBe(6);
  });
});
```

### コミットしてプッシュ
```bash
git add src/__tests__/
git commit -m "Add math tests"
git push
```

### 結果を確認
1. GitHub Actions でワークフローが実行される
2. Sentry Prevent にテスト結果が送信される
3. PRコメントに結果が表示される

---

## 📝 6. 現在の設定状況

### 設定済み
- ✅ Jest
- ✅ jest-junit
- ✅ GitHub Actionsワークフロー
- ✅ サンプルテスト

### 次に必要なこと
- ⏳ 初回のワークフロー実行
- ⏳ Sentryでのテスト結果の確認
- ⏳ OIDCまたはAPIトークンの動作確認

---

## 🎯 今すぐ確認すること

1. **GitHub Actions**: https://github.com/mogcia-app/signal-/actions
   - 最新のワークフローをクリック
   - ログを確認
   
2. **Sentry Prevent**: https://mogcia.sentry.io/prevent/signal/
   - ダッシュボードを開く
   - テスト結果を確認

3. **エラーの有無**
   - エラーがある場合は、このドキュメントのトラブルシューティングを参照

---

## 📚 参考リンク

- [Sentry Prevent ドキュメント](https://docs.sentry.io/product/prevent/)
- [Jest ドキュメント](https://jestjs.io/docs/getting-started)
- [GitHub Actions ドキュメント](https://docs.github.com/en/actions)

