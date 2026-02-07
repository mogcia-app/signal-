#!/bin/bash

# Firestore Security Rules 簡単テストスクリプト

echo "🔍 Firestore Security Rules テスト開始"
echo ""

# 1. 構文チェック
echo "1️⃣ 構文チェック中..."
if firebase deploy --only firestore:rules --dry-run 2>&1 | grep -q "Error"; then
    echo "❌ 構文エラーが見つかりました"
    firebase deploy --only firestore:rules --dry-run
    exit 1
else
    echo "✅ 構文チェック: OK"
fi

echo ""
echo "2️⃣ ルールファイルの内容確認..."
echo "   - ファイル: firestore.rules.final"
echo "   - 行数: $(wc -l < firestore.rules.final)"
echo ""

# 3. 主要なルールパターンの確認
echo "3️⃣ 主要なルールパターンの確認..."
if grep -q "is string" firestore.rules.final; then
    echo "❌ エラー: 'is string' 構文が見つかりました（存在しない構文です）"
    exit 1
else
    echo "✅ 'is string' 構文: なし（OK）"
fi

if grep -q "changedKeys()" firestore.rules.final; then
    echo "✅ 'changedKeys()' 使用: OK"
else
    echo "⚠️  'changedKeys()' が見つかりません（keys()を使用している可能性があります）"
fi

if grep -q "allow read.*isAuthenticated" firestore.rules.final; then
    echo "✅ 認証チェック: OK"
fi

if grep -q "allow.*isAdmin" firestore.rules.final; then
    echo "✅ 管理者チェック: OK"
fi

echo ""
echo "✅ 基本的なチェック完了！"
echo ""
echo "📝 次のステップ:"
echo "   1. Firebase Consoleでルールを適用"
echo "   2. 実際のアプリで動作確認"
echo ""



























