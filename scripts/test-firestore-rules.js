/**
 * Firestore Security Rules テストスクリプト
 * 
 * 使用方法:
 * 1. Firebase Emulatorを起動: firebase emulators:start --only firestore
 * 2. このスクリプトを実行: node scripts/test-firestore-rules.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');
const path = require('path');

// テスト環境の設定
const PROJECT_ID = 'signal-v1-fc481-test';
const RULES_PATH = path.join(__dirname, '..', 'firestore.rules.final');

let testEnv;

async function setup() {
  // Firestore Rulesを読み込む
  const rules = readFileSync(RULES_PATH, 'utf8');
  
  // テスト環境を初期化
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: 'localhost',
      port: 8080,
    },
  });
}

async function cleanup() {
  if (testEnv) {
    await testEnv.cleanup();
  }
}

// テストケース
async function testUsersCollection() {
  console.log('\n📋 Users Collection テスト');
  
  const user1Id = 'user1';
  const user2Id = 'user2';
  const adminId = 'admin1';
  
  // テスト1: ユーザーが自分のドキュメントを読み取れる
  console.log('  ✓ 自分のドキュメントを読み取れる');
  const user1Context = testEnv.authenticatedContext(user1Id, {
    email: 'user1@example.com',
  });
  const user1Doc = user1Context.firestore().collection('users').doc(user1Id);
  await user1Doc.set({
    name: 'User 1',
    email: 'user1@example.com',
    status: 'active',
  });
  const user1Data = await user1Doc.get();
  console.log('    → 成功: 自分のドキュメントを読み取れました');
  
  // テスト2: ユーザーが他人のドキュメントを読み取れない
  console.log('  ✓ 他人のドキュメントを読み取れない');
  const user2Doc = user1Context.firestore().collection('users').doc(user2Id);
  try {
    await user2Doc.get();
    console.log('    → 失敗: 他人のドキュメントを読み取れてしまいました');
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('    → 成功: 適切に拒否されました');
    } else {
      console.log('    → エラー:', error.message);
    }
  }
  
  // テスト3: ユーザーが許可されたフィールドのみ更新できる
  console.log('  ✓ 許可されたフィールドのみ更新できる');
  try {
    await user1Doc.update({
      name: 'Updated Name',
      businessInfo: { industry: 'IT' },
      updatedAt: new Date().toISOString(),
    });
    console.log('    → 成功: 許可されたフィールドの更新ができました');
  } catch (error) {
    console.log('    → エラー:', error.message);
  }
  
  // テスト4: ユーザーがstatusフィールドを更新できない
  console.log('  ✓ statusフィールドを更新できない');
  try {
    await user1Doc.update({
      status: 'suspended',
      updatedAt: new Date().toISOString(),
    });
    console.log('    → 失敗: statusフィールドを更新できてしまいました');
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('    → 成功: 適切に拒否されました');
    } else {
      console.log('    → エラー:', error.message);
    }
  }
  
  // テスト5: 管理者が全ユーザーのドキュメントを読み取れる
  console.log('  ✓ 管理者が全ユーザーのドキュメントを読み取れる');
  const adminContext = testEnv.authenticatedContext(adminId, {
    email: 'admin@signalapp.jp',
  });
  const adminUser1Doc = adminContext.firestore().collection('users').doc(user1Id);
  const adminData = await adminUser1Doc.get();
  console.log('    → 成功: 管理者は全ユーザーのドキュメントを読み取れました');
}

async function testPlansCollection() {
  console.log('\n📋 Plans Collection テスト');
  
  const user1Id = 'user1';
  const user2Id = 'user2';
  
  const user1Context = testEnv.authenticatedContext(user1Id, {
    email: 'user1@example.com',
  });
  
  // テスト1: ユーザーが自分のプランを作成できる
  console.log('  ✓ 自分のプランを作成できる');
  const plan1 = user1Context.firestore().collection('plans').doc('plan1');
  await plan1.set({
    userId: user1Id,
    title: 'My Plan',
    status: 'active',
  });
  console.log('    → 成功: 自分のプランを作成できました');
  
  // テスト2: ユーザーが他人のuserIdでプランを作成できない
  console.log('  ✓ 他人のuserIdでプランを作成できない');
  const plan2 = user1Context.firestore().collection('plans').doc('plan2');
  try {
    await plan2.set({
      userId: user2Id, // 他人のuserId
      title: 'Other User Plan',
    });
    console.log('    → 失敗: 他人のuserIdでプランを作成できてしまいました');
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('    → 成功: 適切に拒否されました');
    } else {
      console.log('    → エラー:', error.message);
    }
  }
  
  // テスト3: ユーザーが自分のプランのuserIdを変更できない
  console.log('  ✓ 自分のプランのuserIdを変更できない');
  try {
    await plan1.update({
      userId: user2Id, // userIdを変更しようとする
    });
    console.log('    → 失敗: userIdを変更できてしまいました');
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('    → 成功: 適切に拒否されました');
    } else {
      console.log('    → エラー:', error.message);
    }
  }
}

async function testUnauthenticatedAccess() {
  console.log('\n📋 未認証アクセステスト');
  
  const unauthenticatedContext = testEnv.unauthenticatedContext();
  
  // テスト1: 未認証ユーザーがドキュメントを読み取れない
  console.log('  ✓ 未認証ユーザーがドキュメントを読み取れない');
  const userDoc = unauthenticatedContext.firestore().collection('users').doc('user1');
  try {
    await userDoc.get();
    console.log('    → 失敗: 未認証ユーザーがドキュメントを読み取れてしまいました');
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log('    → 成功: 適切に拒否されました');
    } else {
      console.log('    → エラー:', error.message);
    }
  }
}

// メイン実行
async function runTests() {
  console.log('🚀 Firestore Security Rules テスト開始\n');
  
  try {
    await setup();
    
    await testUsersCollection();
    await testPlansCollection();
    await testUnauthenticatedAccess();
    
    console.log('\n✅ すべてのテストが完了しました');
  } catch (error) {
    console.error('\n❌ テスト実行中にエラーが発生しました:', error);
  } finally {
    await cleanup();
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };







