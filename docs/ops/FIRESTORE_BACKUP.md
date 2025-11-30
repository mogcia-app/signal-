# Firestore バックアップ設定ガイド

このドキュメントでは、Signal.プロジェクトのFirestoreデータベースのバックアップ戦略と設定方法を説明します。

## 📋 バックアップ戦略

Signal.では、**2層のバックアップ戦略**を採用しています：

1. **Google Cloud Backup for Firestore**（自動バックアップ）
2. **週次バックアップ**（Cloud StorageへのJSONエクスポート）

---

## 🛡️ 対策1: Backup for Firestore（自動バックアップ）

### 概要
Google Cloudが提供する自動バックアップ機能。1日1回自動でバックアップを取得し、Googleの内部領域に保存されます。

### メリット
- ✅ 設定が簡単（ONにするだけ）
- ✅ Googleが管理するため信頼性が高い
- ✅ Firestore破損時も復旧可能
- ✅ コストが低い（月数百円レベル）

### どんな時に必要になる？

**Backup for Firestoreが必要になる場面**:

1. **Firestoreの内部エラーや破損**
   - Firestore自体に問題が発生した場合
   - Google側の障害でデータが失われた場合
   - データベースの整合性エラーが発生した場合

2. **より頻繁なバックアップが必要**
   - 週次バックアップでは間に合わない
   - 毎日のバックアップが必要な場合

3. **Google管理のバックアップが欲しい**
   - Googleが完全に管理するため、メンテナンス不要
   - 自動的な整合性チェック

**週次バックアップ（Cloud Storage）で十分な場面**:

1. **人為的なミス（誤削除など）**
   - コードのバグでデータを削除してしまった
   - 誤ってコレクションを削除した
   - データを上書きしてしまった

2. **データの移行やエクスポート**
   - 他のシステムに移行したい
   - データを分析したい
   - JSON形式でデータを取得したい

3. **コストを抑えたい**
   - 週1回のバックアップで十分
   - 追加コストを最小限にしたい

### 推奨される使い分け

- **週次バックアップ（Cloud Storage）**: 既に実装済み ✅
  - 人為的ミスからの復旧
  - データのエクスポート・移行
  - コスト効率が良い

- **Backup for Firestore**: オプション（後で追加可能）
  - Firestore自体の障害対策
  - より頻繁なバックアップが必要な場合
  - Google管理のバックアップが欲しい場合

**結論**: 現時点では週次バックアップで十分です。Backup for Firestoreは、より高い可用性が必要になった時や、Firestore自体の障害リスクを考慮したい時に追加すれば良いでしょう。

### 設定手順

#### 1. Google Cloud Consoleで有効化

**重要**: 「Backup and DR」ではなく、「Firestore Backups」のページにアクセスしてください。

**正しいページへのアクセス方法**:

1. [Firestore Backups（直接リンク）](https://console.cloud.google.com/firestore/backups?project=signal-v1-fc481) にアクセス
   - または、[Firestore データベース](https://console.cloud.google.com/firestore/databases?project=signal-v1-fc481) → **Backups** タブを選択

2. **Create Backup Schedule** ボタンをクリック

3. 以下の設定を入力：
   - **Database**: `(default)`
   - **Location**: `asia-northeast1` (東京)
   - **Recurrence**: `Daily` (毎日)
   - **Retention**: `7 days` (7日間保持)

4. **Create** をクリック

**注意**: 「Backup and DR」の設定画面が表示された場合は、別のサービスです。Firestore Backupsのページに移動してください。

#### 2. gcloud CLIから有効化（オプション）

```bash
gcloud firestore backups schedules create \
  --database='(default)' \
  --retention=7d \
  --recurrence='daily' \
  --location='asia-northeast1' \
  --project=signal-v1-fc481
```

#### 2. バックアップの確認

```bash
# バックアップ一覧を確認
gcloud firestore backups list --database='(default)'
```

#### 3. バックアップからの復元（必要な場合）

```bash
# バックアップIDを指定して復元
gcloud firestore databases restore \
  --backup=BACKUP_ID \
  --database='(default)'
```

⚠️ **注意**: 復元操作は既存のデータを上書きします。実行前に必ず確認してください。

---

## 🛡️ 対策2: 週次バックアップ（Cloud Storage）

### 概要
Cloud Functionsのスケジュール機能を使用して、毎週日曜日にFirestoreの全データをCloud StorageにJSON形式でエクスポートします。

### メリット
- ✅ Firebaseで事故が起きても別の場所にデータがある
- ✅ JSON形式なので、他のシステムへの移行も容易
- ✅ 30日間のバックアップを自動保持
- ✅ メタデータも保存されるため、復元時に情報が分かる

### 実装内容

#### 実行スケジュール
- **頻度**: 毎週日曜日
- **時刻**: 午前3時（JST）
- **タイムゾーン**: `Asia/Tokyo`

#### 再試行設定（推奨）

バックアップは重要な処理のため、失敗時の再試行を設定することを推奨します：

- **最大再試行回数**: `3`（3回まで再試行）
- **最大試行時間**: `30m`（30分間再試行を続ける）
- **最小バックオフ時間**: `5m`（最初の再試行まで5分待機）
- **最大バックオフ時間**: `1h`（最大1時間待機してから再試行）
- **最大倍増回数**: `5`（バックオフ時間を最大5倍まで増やす）
- **試行期限**: `10m`（1回の試行は10分でタイムアウト）

**設定理由**:
- バックアップ処理は最大9分（540秒）かかるため、試行期限は10分に設定
- ネットワークエラーなどの一時的な問題は数分で解決する可能性があるため、最小バックオフは5分
- 3回の再試行で解決しない場合は、手動で確認する方が良いため、最大再試行回数は3回

#### バックアップ先
- **Cloud Storage バケット**: `{PROJECT_ID}-backups`
- **パス**: `firestore-backups/{TIMESTAMP}/`
- **ファイル**:
  - `firestore-export.json`: 全データのJSONエクスポート
  - `metadata.json`: バックアップ情報（コレクション数、ドキュメント数など）

#### 自動削除
- 30日以上前のバックアップは自動的に削除されます

### デプロイ手順

#### 1. 依存関係のインストール

```bash
cd functions
npm install
```

#### 2. Functionsのデプロイ

```bash
# 全体をデプロイ
firebase deploy --only functions

# または、バックアップ関数のみデプロイ
firebase deploy --only functions:weeklyBackup
```

#### 3. 環境変数の設定（オプション）

デフォルトでは、バケット名は `{PROJECT_ID}-backups` になります。
カスタムバケット名を使用する場合：

```bash
firebase functions:config:set backup.bucket_name="your-custom-bucket-name"
firebase deploy --only functions:weeklyBackup
```

#### 4. 手動実行（テスト用）

**方法1: Firebase Consoleから実行（最も簡単）**

1. [Firebase Console - Functions](https://console.firebase.google.com/project/signal-v1-fc481/functions) にアクセス
2. `weeklyBackup` 関数をクリック
3. **TESTING** タブを開く（または **LOGS** タブでログを確認）
4. 手動実行する場合は、下記の「方法2」を使用

**方法1-2: Google Cloud Consoleから実行（推奨）**

1. [Cloud Scheduler (直接リンク)](https://console.cloud.google.com/cloudscheduler?project=signal-v1-fc481&location=asia-northeast1) にアクセス
   - または、Firebase Console → ⚙️ プロジェクトの設定 → 統合 → **Google Cloud Console で開く** から開く
2. `weeklyBackup` ジョブを選択（一覧に表示されているはずです）
3. 右上の **RUN NOW** ボタンをクリック
4. 実行ログを確認（同じページの **実行履歴** タブで確認できます）

**方法1-3: Cloud Functionsから直接実行**

Cloud Schedulerの権限がない場合：
1. [Cloud Functions (直接リンク)](https://console.cloud.google.com/functions?project=signal-v1-fc481&location=asia-northeast1) にアクセス
2. `weeklyBackup` 関数を選択
3. **TEST** タブを開く
4. **Trigger event** に `{}` を入力
5. **Test the function** をクリック
6. 実行ログを確認

**方法2: gcloud CLIから実行**

```bash
# Cloud Schedulerジョブを手動実行
gcloud scheduler jobs run weeklyBackup \
  --location=asia-northeast1

# または、直接Cloud Functionsを呼び出す
gcloud functions call weeklyBackup \
  --region=asia-northeast1 \
  --data='{}'
```

**方法3: ログの確認**

```bash
# リアルタイムログを確認
firebase functions:log --only weeklyBackup --follow

# 最新のログのみ
firebase functions:log --only weeklyBackup --limit 50
```

### バックアップの確認

#### Cloud Storage Consoleから確認

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. **Cloud Storage** → **Buckets** に移動
3. `{PROJECT_ID}-backups` バケットを開く
4. `firestore-backups/` フォルダ内にバックアップが保存されていることを確認

#### gcloud CLIから確認

```bash
# バケット一覧を確認
gsutil ls

# バックアップファイルを確認
gsutil ls -r gs://{PROJECT_ID}-backups/firestore-backups/

# 最新のバックアップをダウンロード
gsutil cp -r gs://{PROJECT_ID}-backups/firestore-backups/{LATEST_TIMESTAMP}/ ./
```

### バックアップからの復元

#### 1. バックアップファイルをダウンロード

```bash
gsutil cp gs://{PROJECT_ID}-backups/firestore-backups/{TIMESTAMP}/firestore-export.json ./
```

#### 2. データを確認

```bash
# JSONファイルの構造を確認
cat firestore-export.json | jq 'keys'  # コレクション一覧
cat firestore-export.json | jq '.["collection_name"] | length'  # ドキュメント数
```

#### 3. 復元スクリプトの実行

復元用のスクリプトを作成する場合：

```typescript
// restore-backup.ts (例)
import * as admin from "firebase-admin";
import * as fs from "fs";

admin.initializeApp();
const db = admin.firestore();

const backupData = JSON.parse(fs.readFileSync("./firestore-export.json", "utf8"));

for (const [collectionName, documents] of Object.entries(backupData)) {
  if (Array.isArray(documents)) {
    const batch = db.batch();
    documents.forEach((doc: any) => {
      const docRef = db.collection(collectionName).doc(doc.id);
      // Timestampの復元処理が必要
      batch.set(docRef, doc.data);
    });
    await batch.commit();
    console.log(`復元完了: ${collectionName} (${documents.length}件)`);
  }
}
```

⚠️ **注意**: 復元操作は既存のデータを上書きする可能性があります。実行前に必ず確認してください。

---

## 📊 バックアップの監視

### Cloud Functions のログ確認

```bash
# リアルタイムログ
firebase functions:log --only weeklyBackup --follow

# 最新のログのみ
firebase functions:log --only weeklyBackup --limit 50
```

### アラート設定（推奨）

Google Cloud Monitoringで、バックアップ関数のエラーを監視するアラートを設定することを推奨します。

1. [Cloud Monitoring](https://console.cloud.google.com/monitoring) にアクセス
2. **Alerting** → **Create Policy** をクリック
3. 以下の条件を設定：
   - **Metric**: `cloudfunctions.googleapis.com/function/execution_count`
   - **Filter**: `resource.function_name="weeklyBackup"` AND `severity="ERROR"`
   - **Threshold**: `> 0`
4. 通知チャネルを設定（メール、Slackなど）

---

## 💰 コスト見積もり

### Backup for Firestore
- **月額**: 約500-1,000円（データ量による）
- **保持期間**: 7日間

### 週次バックアップ（Cloud Storage）
- **ストレージ**: 約100-500円/月（データ量による）
- **Functions実行**: 約50-200円/月（実行時間による）
- **保持期間**: 30日間

**合計**: 約650-1,700円/月

---

## 🔧 トラブルシューティング

### バックアップが実行されない

1. **Cloud Schedulerの確認**
   ```bash
   gcloud scheduler jobs list --location=asia-northeast1
   ```

2. **Functionsのログを確認**
   ```bash
   firebase functions:log --only weeklyBackup
   ```

3. **権限の確認**
   - Cloud FunctionsにFirestore読み取り権限があるか
   - Cloud Storageへの書き込み権限があるか

### バックアップファイルが大きすぎる

- コレクションごとに分割して保存するように修正可能
- 圧縮（gzip）を有効化することも可能

### タイムアウトエラー

- `timeoutSeconds` を増やす（最大540秒）
- メモリを増やす（`memory: "1GiB"`）

---

## 📝 参考リンク

- [Backup for Firestore ドキュメント](https://cloud.google.com/firestore/docs/backups)
- [Cloud Functions スケジュール機能](https://firebase.google.com/docs/functions/schedule-functions)
- [Cloud Storage ドキュメント](https://cloud.google.com/storage/docs)

