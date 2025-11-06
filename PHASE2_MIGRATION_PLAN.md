# Phase 2: authFetch() 導入計画

## 🎯 目的

全てのAPIリクエストに認証トークンを自動付与し、middleware再有効化の準備を整える

---

## 📋 書き換え対象ファイルリスト（優先度順）

### 🔴 **優先度: 高（投稿・シミュレーション系）**

#### 1. `src/app/x/lab/page.tsx`

- **Line 40-45**: `/api/x/posts` (POST)

```typescript
// 修正前
const response = await fetch('/api/x/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... })
});

// 修正後
import { authFetch } from '@/utils/authFetch';
const response = await authFetch('/api/x/posts', {
  method: 'POST',
  body: JSON.stringify({ ... })
});
```

#### 2. `src/app/x/plan/hooks/usePlanForm.ts`

- **Line 86-91**: `/api/x/plans` (POST)

#### 3. `src/app/x/plan/hooks/useSimulation.ts`

- **Line 45-50**: `/api/x/simulation` (POST)

#### 4. `src/app/instagram/plan/hooks/useSimulation.ts`

- **Line 45-50**: `/api/instagram/simulation` (POST)

#### 5. `src/app/instagram/plan/hooks/useABTest.ts`

- **Line 18-23**: `/api/instagram/ab-test` (POST)

---

### 🟠 **優先度: 中（分析・レポート系）**

#### 6. `src/app/x/monthly-report/page.tsx`

- **Line 109**: `/api/x/monthly-report` (GET)

```typescript
// 修正前
const response = await fetch(
  `/api/x/monthly-report?userId=${user.uid}&period=${period}&date=${date}`
);

// 修正後
import { authFetch } from "@/utils/authFetch";
const response = await authFetch(
  `/api/x/monthly-report?userId=${user.uid}&period=${period}&date=${date}`
);
```

#### 7. `src/app/x/posts/page.tsx`

- **Line 56**: `/api/x/posts` (GET)
- **Line 60**: `/api/x/analytics` (GET)
- **Line 126**: `/api/x/posts/:id` (DELETE)

#### 8. `src/app/x/analytics/page.tsx`

- **Line 138**: `/api/x/analytics` (POST)
- **Line 220**: `/api/x/analytics` (GET) - **既に修正済み（Authorizationヘッダーあり）**

---

### 🟢 **優先度: 低（通知・その他）**

#### 9. `src/app/notifications/page.tsx`

- **Line 441**: `/api/notifications/:id/actions` (POST) - markAsRead
- **Line 472**: `/api/notifications/:id/actions` (POST) - toggleStar
- **Line 503**: `/api/notifications/:id/actions` (POST) - archiveNotification

#### 10. `src/app/x/lab/components/AIPostGenerator.tsx`

- **Line 39**: `/api/x/post-generation` (POST) - 最適投稿時間
- **Line 95**: `/api/x/post-generation` (POST) - 投稿文生成

#### 11. `src/app/x/plan/hooks/useAIDiagnosis.ts`

- **Line 16**: `/api/x/ai-diagnosis` (POST)

#### 12. `src/app/instagram/plan/hooks/useAIDiagnosis.ts`

- **Line 16**: `/api/instagram/ai-diagnosis` (POST)

#### 13. `src/app/instagram/plan/hooks/useAIStrategy.ts`

- **Line 34**: `/api/instagram/ai-strategy` (POST)

---

## 🔧 **書き換え手順（段階的）**

### **ステップ1: authFetch導入**

```bash
# authFetch.tsを作成（完了）
git add src/utils/authFetch.ts
git commit -m "feat: authFetch導入 - Phase 2開始"
```

### **ステップ2: 優先度高から順次置き換え**

```bash
# 1ファイルずつ修正
# テスト
# コミット
```

### **ステップ3: 全置き換え完了後**

```bash
# middleware.tsのコメントを外す
# テスト
# 本番デプロイ
```

---

## ✅ **置き換え完了チェックリスト**

- [ ] `src/app/x/lab/page.tsx`
- [ ] `src/app/x/plan/hooks/usePlanForm.ts`
- [ ] `src/app/x/plan/hooks/useSimulation.ts`
- [ ] `src/app/instagram/plan/hooks/useSimulation.ts`
- [ ] `src/app/instagram/plan/hooks/useABTest.ts`
- [ ] `src/app/x/monthly-report/page.tsx`
- [ ] `src/app/x/posts/page.tsx`
- [ ] `src/app/x/analytics/page.tsx`
- [ ] `src/app/notifications/page.tsx`
- [ ] `src/app/x/lab/components/AIPostGenerator.tsx`
- [ ] `src/app/x/plan/hooks/useAIDiagnosis.ts`
- [ ] `src/app/instagram/plan/hooks/useAIDiagnosis.ts`
- [ ] `src/app/instagram/plan/hooks/useAIStrategy.ts`

---

## 🎯 **推奨: 優先度高の5ファイルから開始**

まず以下の5ファイルを修正すれば、主要機能が安全になります：

1. `src/app/x/lab/page.tsx` - 投稿作成
2. `src/app/x/plan/hooks/usePlanForm.ts` - 計画作成
3. `src/app/x/plan/hooks/useSimulation.ts` - Xシミュレーション
4. `src/app/instagram/plan/hooks/useSimulation.ts` - Instagramシミュレーション
5. `src/app/x/monthly-report/page.tsx` - 月次レポート

---

**これらの5ファイルから始めますか？** 具体的な修正コードを提示します。
