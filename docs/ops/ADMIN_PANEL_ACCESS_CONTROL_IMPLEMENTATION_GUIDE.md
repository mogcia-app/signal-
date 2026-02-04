# Admin Panel側：アクセス制御機能実装ガイド

## 📋 概要

このガイドでは、Admin Panelの「アクセス制御」ページから、Signal.ツール側のメンテナンスモードを制御する機能を実装する手順を説明します。

Admin Panelから、Signal.ツール側のメンテナンスモードを有効化・無効化できるようにします。

---

## 🎯 実装する機能

1. **アクセス制御ページの作成** - メンテナンスモードを制御するUI
2. **メンテナンス状態の取得** - Signal.ツール側の現在の状態を表示
3. **メンテナンスモードの設定** - メンテナンス開始・終了の制御
4. **スケジュール機能** - 予定されたメンテナンスの設定

---

## 📦 前提条件

- Admin Panelプロジェクトが利用可能であること
- Signal.ツール側のCloud Functionsがデプロイ済みであること
- Firebase FunctionsのエンドポイントURLが取得できること

---

## 📁 実装手順

### ステップ1: API設定の追加

**ファイル: `src/lib/api-config.ts`** （既存ファイルに追加、または新規作成）

```typescript
export const API_ENDPOINTS = {
  toolMaintenance: {
    getStatus: 'https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/getToolMaintenanceStatus',
    setMode: 'https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/setToolMaintenanceMode'
  }
}

// 注意: YOUR-REGION と YOUR-PROJECT を実際の値に置き換えてください
// 例: 'https://asia-northeast1-signal-v1-fc481.cloudfunctions.net/getToolMaintenanceStatus'
```

**Functions URLの確認方法:**
```bash
# Firebase CLIで確認
firebase functions:list

# または、Firebase Console → Functions → 関数名 → URL
```

---

### ステップ2: メンテナンス状態を取得する関数

**ファイル: `src/lib/tool-maintenance-api.ts`** （新規作成）

```typescript
import { API_ENDPOINTS } from './api-config'

export interface ToolMaintenanceStatus {
  enabled: boolean
  message: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
  updatedBy: string
  updatedAt: string | null
}

export interface SetMaintenanceModeRequest {
  enabled: boolean
  message?: string
  scheduledStart?: string
  scheduledEnd?: string
  updatedBy?: string
}

/**
 * Signal.ツール側のメンテナンス状態を取得
 */
export async function getToolMaintenanceStatus(): Promise<ToolMaintenanceStatus> {
  try {
    const response = await fetch(API_ENDPOINTS.toolMaintenance.getStatus, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch maintenance status: ${response.statusText}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch maintenance status')
    }

    return result.data
  } catch (error) {
    console.error('Error fetching tool maintenance status:', error)
    throw error
  }
}

/**
 * Signal.ツール側のメンテナンスモードを設定
 */
export async function setToolMaintenanceMode(
  request: SetMaintenanceModeRequest
): Promise<ToolMaintenanceStatus> {
  try {
    const response = await fetch(API_ENDPOINTS.toolMaintenance.setMode, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Failed to set maintenance mode: ${response.statusText}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to set maintenance mode')
    }

    return result.data
  } catch (error) {
    console.error('Error setting tool maintenance mode:', error)
    throw error
  }
}
```

---

### ステップ3: アクセス制御ページの作成

**ファイル: `src/app/admin/access-control/page.tsx`** （新規作成）

```typescript
'use client'

import { useState, useEffect } from 'react'
import { getToolMaintenanceStatus, setToolMaintenanceMode, ToolMaintenanceStatus } from '@/lib/tool-maintenance-api'
import { useAuth } from '@/contexts/auth-context' // 認証コンテキスト（適宜調整）

export default function AccessControlPage() {
  const { user } = useAuth() // 現在のユーザー情報を取得
  const [maintenanceStatus, setMaintenanceStatus] = useState<ToolMaintenanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // フォーム状態
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')

  // メンテナンス状態を取得
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true)
        const status = await getToolMaintenanceStatus()
        setMaintenanceStatus(status)
        setEnabled(status.enabled)
        setMessage(status.message || '')
        setScheduledStart(status.scheduledStart || '')
        setScheduledEnd(status.scheduledEnd || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : '状態の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  // メンテナンスモードを設定
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await setToolMaintenanceMode({
        enabled,
        message: message || undefined,
        scheduledStart: scheduledStart || undefined,
        scheduledEnd: scheduledEnd || undefined,
        updatedBy: user?.email || user?.uid || 'admin',
      })

      setMaintenanceStatus(result)
      setSuccess(enabled ? 'メンテナンスモードを開始しました' : 'メンテナンスモードを終了しました')
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // メンテナンス開始（即座）
  const handleStartMaintenance = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await setToolMaintenanceMode({
        enabled: true,
        message: message || 'システムメンテナンス中です。しばらくお待ちください。',
        updatedBy: user?.email || user?.uid || 'admin',
      })

      setMaintenanceStatus(result)
      setEnabled(true)
      setMessage(result.message)
      setSuccess('メンテナンスモードを開始しました')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メンテナンス開始に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // メンテナンス終了
  const handleEndMaintenance = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await setToolMaintenanceMode({
        enabled: false,
        message: '',
        updatedBy: user?.email || user?.uid || 'admin',
      })

      setMaintenanceStatus(result)
      setEnabled(false)
      setMessage('')
      setScheduledStart('')
      setScheduledEnd('')
      setSuccess('メンテナンスモードを終了しました')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メンテナンス終了に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">アクセス制御</h1>

        {/* 現在の状態表示 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">現在の状態</h2>
          {maintenanceStatus && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold">メンテナンスモード:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    maintenanceStatus.enabled
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {maintenanceStatus.enabled ? '有効' : '無効'}
                </span>
              </div>
              {maintenanceStatus.message && (
                <div>
                  <span className="font-semibold">メッセージ:</span>
                  <p className="text-gray-700 mt-1">{maintenanceStatus.message}</p>
                </div>
              )}
              {maintenanceStatus.scheduledStart && maintenanceStatus.scheduledEnd && (
                <div>
                  <span className="font-semibold">スケジュール:</span>
                  <p className="text-gray-700 mt-1">
                    {new Date(maintenanceStatus.scheduledStart).toLocaleString('ja-JP')} ～
                    {new Date(maintenanceStatus.scheduledEnd).toLocaleString('ja-JP')}
                  </p>
                </div>
              )}
              {maintenanceStatus.updatedAt && (
                <div>
                  <span className="font-semibold">最終更新:</span>
                  <p className="text-gray-700 mt-1">
                    {new Date(maintenanceStatus.updatedAt).toLocaleString('ja-JP')}
                  </p>
                </div>
              )}
              {maintenanceStatus.updatedBy && (
                <div>
                  <span className="font-semibold">更新者:</span>
                  <p className="text-gray-700 mt-1">{maintenanceStatus.updatedBy}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* クイックアクション */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">クイックアクション</h2>
          <div className="flex space-x-4">
            <button
              onClick={handleStartMaintenance}
              disabled={saving || maintenanceStatus?.enabled}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              メンテナンス開始
            </button>
            <button
              onClick={handleEndMaintenance}
              disabled={saving || !maintenanceStatus?.enabled}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              メンテナンス終了
            </button>
          </div>
        </div>

        {/* 詳細設定フォーム */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">詳細設定</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* メンテナンスモード有効化 */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="font-semibold">メンテナンスモードを有効化</span>
              </label>
            </div>

            {/* メッセージ */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                メンテナンスメッセージ
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="システムメンテナンス中です。しばらくお待ちください。"
              />
            </div>

            {/* スケジュール開始 */}
            <div>
              <label htmlFor="scheduledStart" className="block text-sm font-medium text-gray-700 mb-2">
                スケジュール開始日時（オプション）
              </label>
              <input
                type="datetime-local"
                id="scheduledStart"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* スケジュール終了 */}
            <div>
              <label htmlFor="scheduledEnd" className="block text-sm font-medium text-gray-700 mb-2">
                スケジュール終了日時（オプション）
              </label>
              <input
                type="datetime-local"
                id="scheduledEnd"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 送信ボタン */}
            <div>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '設定を保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
```

---

### ステップ4: ナビゲーションへの追加

**ファイル: `src/components/navigation.tsx`** （既存ファイルに追加）

```typescript
// ナビゲーションメニューに追加
{
  name: 'アクセス制御',
  href: '/admin/access-control',
  icon: ShieldIcon, // 適切なアイコンをインポート
}
```

---

## 🔍 動作確認

### 1. テスト手順

1. Admin Panelにログイン
2. 「アクセス制御」ページにアクセス
3. 現在のメンテナンス状態が表示されることを確認
4. 「メンテナンス開始」ボタンをクリック
5. Signal.ツール側でログインページにアクセス
6. メンテナンス画面が表示されることを確認
7. Admin Panelで「メンテナンス終了」をクリック
8. Signal.ツール側でログインできることを確認

### 2. トラブルシューティング

**CORSエラーが発生する場合:**
- Signal.ツール側のFunctionsのCORS設定を確認
- APIエンドポイントURLが正しいか確認

**メンテナンス状態が取得できない場合:**
- Functionsがデプロイされているか確認
- Functionsのログを確認（`firebase functions:log`）
- ネットワークタブでAPIリクエストのレスポンスを確認

**メンテナンスモードが設定できない場合:**
- Firestoreのセキュリティルールを確認
- Functionsのログを確認
- リクエストボディが正しい形式か確認

---

## 📝 補足事項

### スケジュール機能

`scheduledStart` と `scheduledEnd` が設定されている場合、Signal.ツール側で指定された時間帯のみメンテナンスモードが有効になります。

### リアルタイム更新

現在の実装では、ページをリロードするまで状態が更新されません。リアルタイムで状態を監視したい場合は、定期的にポーリングするか、Firestoreの`onSnapshot`を使用してください。

### セキュリティ

- Admin Panel側でも、管理者のみがアクセスできるように認証・認可を実装してください
- APIエンドポイントURLは環境変数で管理することを推奨します

---

## 完了

これで、Admin PanelからSignal.ツール側のメンテナンスモードを制御できるようになりました！

Admin Panelで「メンテナンス開始」をクリックすると、Signal.ツール側のログインがブロックされ、メンテナンス画面が表示されます。

