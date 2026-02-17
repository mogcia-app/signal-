#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

const CASES_PATH = path.join(process.cwd(), "scripts/fixtures/ai-quality-cases.json");

const THRESHOLDS = {
  consistency: 0.65,
  planAdherence: 0.5,
  prohibitedViolation: 0.1,
  kpiAlignment: 0.5,
  overall: 0.75,
};

function normalizeText(text) {
  return String(text || "").toLowerCase();
}

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[\s、。,.!?！？:\-_/()\[\]{}]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function hasAnyKeyword(text, phrase) {
  const hay = normalizeText(text);
  const keywords = tokenize(phrase);
  if (keywords.length === 0) {
    return false;
  }
  return keywords.some((keyword) => hay.includes(keyword));
}

function hasPattern(text, patterns) {
  const hay = normalizeText(text);
  return patterns.some((pattern) => hay.includes(pattern));
}

function heuristicRuleHit(text, rule) {
  const normalizedRule = normalizeText(rule);
  if (hasAnyKeyword(text, rule)) {
    return true;
  }

  const mapping = [
    { keys: ["保存", "保存率"], patterns: ["保存"] },
    { keys: ["結論"], patterns: ["結論", "先に", "まず"] },
    { keys: ["箇条書き"], patterns: ["1つ目", "2つ目", "3つ目", "・"] },
    { keys: ["手順"], patterns: ["手順", "1つ目", "2つ目", "3つ目"] },
    { keys: ["比較"], patterns: ["比較", "改善前", "改善後"] },
    { keys: ["実績", "数値"], patterns: ["%", "向上", "増", "実績"] },
    { keys: ["cta", "行動", "誘導"], patterns: ["保存", "コメント", "dm", "プロフィール", "チェック", "確認"] },
    { keys: ["アクション"], patterns: ["プロフィール", "フォロー", "保存", "コメント", "チェック"] },
    { keys: ["質問"], patterns: ["?", "？", "質問"] },
    { keys: ["dm"], patterns: ["dm"] },
    { keys: ["投票"], patterns: ["投票", "a:", "b:"] },
    { keys: ["短文", "簡潔", "短く", "明快"], patterns: ["。"] },
    { keys: ["丁寧", "信頼", "誠実", "やわらか"], patterns: ["です", "ます"] },
    { keys: ["具体的"], patterns: ["具体", "手順", "3つ"] },
    { keys: ["スピード", "テンポ"], patterns: ["30秒", "すぐ", "短時間"] },
    { keys: ["ブランド", "世界観", "価値"], patterns: ["ブランド", "価値", "方針"] },
    { keys: ["落ち着"], patterns: ["です", "ます"] },
    { keys: ["共感"], patterns: ["ありませんか", "悩み", "困"] },
    { keys: ["プロフィール"], patterns: ["プロフィール"] },
    { keys: ["リーチ"], patterns: ["リーチ"] },
    { keys: ["コメント率", "コメント"], patterns: ["コメント"] },
    { keys: ["フォロー", "フォロー率"], patterns: ["フォロー"] },
    { keys: ["視聴維持率", "完了率"], patterns: ["視聴維持率", "完了率", "最後まで"] },
    { keys: ["シェア"], patterns: ["シェア", "共有"] },
    { keys: ["外部リンク", "リンクタップ"], patterns: ["リンク"] },
  ];

  for (const item of mapping) {
    if (item.keys.some((key) => normalizedRule.includes(key))) {
      return hasPattern(text, item.patterns);
    }
  }

  return false;
}

function coverage(text, rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return 1;
  }
  let hit = 0;
  for (const rule of rules) {
    if (heuristicRuleHit(text, rule)) {
      hit += 1;
    }
  }
  return hit / rules.length;
}

function violationRate(text, avoidRules) {
  if (!Array.isArray(avoidRules) || avoidRules.length === 0) {
    return 0;
  }
  let violated = 0;
  for (const rule of avoidRules) {
    if (hasAnyKeyword(text, rule)) {
      violated += 1;
    }
  }
  return violated / avoidRules.length;
}

function lengthRuleScore(postType, body) {
  const length = String(body || "").length;
  if (postType === "story") {
    return length >= 20 && length <= 120 ? 1 : 0;
  }
  return length >= 120 && length <= 220 ? 1 : 0;
}

function hashtagsRuleScore(hashtags) {
  if (!Array.isArray(hashtags) || hashtags.length < 4) {
    return 0;
  }
  const normalized = hashtags.map((tag) => String(tag || "").trim().toLowerCase()).filter(Boolean);
  if (normalized.length < 4) {
    return 0;
  }
  const uniqueCount = new Set(normalized).size;
  return uniqueCount === normalized.length ? 1 : 0;
}

function basicStructureScore(output) {
  const hasTitle = typeof output.title === "string" && output.title.trim().length > 0;
  const hasBody = typeof output.body === "string" && output.body.trim().length > 0;
  return hasTitle && hasBody ? 1 : 0;
}

function evaluateCase(testCase) {
  const output = testCase.output || {};
  const joinedText = `${output.title || ""}\n${output.body || ""}\n${Array.isArray(output.hashtags) ? output.hashtags.join(" ") : ""}`;

  const planAdherenceMustDo = coverage(joinedText, testCase.mustDo || []);
  const planAdherenceStyle = coverage(joinedText, testCase.styleRules || []);
  const planAdherence = (planAdherenceMustDo + planAdherenceStyle) / 2;
  const prohibitedViolation = violationRate(joinedText, testCase.avoid || []);
  const kpiAlignment = coverage(joinedText, testCase.kpiFocus || []);

  const consistency =
    (lengthRuleScore(testCase.postType, output.body) +
      hashtagsRuleScore(output.hashtags) +
      basicStructureScore(output)) /
    3;

  const overall =
    consistency * 0.3 +
    planAdherence * 0.3 +
    (1 - prohibitedViolation) * 0.2 +
    kpiAlignment * 0.2;

  return {
    id: testCase.id,
    consistency,
    planAdherence,
    prohibitedViolation,
    kpiAlignment,
    overall,
    passed:
      consistency >= THRESHOLDS.consistency &&
      planAdherence >= THRESHOLDS.planAdherence &&
      prohibitedViolation <= THRESHOLDS.prohibitedViolation &&
      kpiAlignment >= THRESHOLDS.kpiAlignment &&
      overall >= THRESHOLDS.overall,
  };
}

function printReport(results) {
  console.log("\nAI Quality Regression (10 fixed cases)");
  console.log("id\tconsistency\tplan\tviol\tkpi\toverall\tpass");
  for (const row of results) {
    console.log(
      `${row.id}\t${row.consistency.toFixed(2)}\t${row.planAdherence.toFixed(2)}\t${row.prohibitedViolation.toFixed(2)}\t${row.kpiAlignment.toFixed(2)}\t${row.overall.toFixed(2)}\t${row.passed ? "OK" : "NG"}`
    );
  }
}

function main() {
  if (!fs.existsSync(CASES_PATH)) {
    console.error(`cases file not found: ${CASES_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CASES_PATH, "utf8");
  const cases = JSON.parse(raw);
  if (!Array.isArray(cases)) {
    console.error("cases must be an array");
    process.exit(1);
  }

  if (cases.length !== 10) {
    console.error(`expected exactly 10 fixed cases, but got ${cases.length}`);
    process.exit(1);
  }

  const results = cases.map(evaluateCase);
  printReport(results);

  const failed = results.filter((r) => !r.passed);
  const aggregate = {
    consistency: results.reduce((sum, r) => sum + r.consistency, 0) / results.length,
    planAdherence: results.reduce((sum, r) => sum + r.planAdherence, 0) / results.length,
    prohibitedViolation: results.reduce((sum, r) => sum + r.prohibitedViolation, 0) / results.length,
    kpiAlignment: results.reduce((sum, r) => sum + r.kpiAlignment, 0) / results.length,
    overall: results.reduce((sum, r) => sum + r.overall, 0) / results.length,
  };

  console.log("\nAggregate:");
  console.log(`consistency=${aggregate.consistency.toFixed(2)}`);
  console.log(`planAdherence=${aggregate.planAdherence.toFixed(2)}`);
  console.log(`prohibitedViolation=${aggregate.prohibitedViolation.toFixed(2)}`);
  console.log(`kpiAlignment=${aggregate.kpiAlignment.toFixed(2)}`);
  console.log(`overall=${aggregate.overall.toFixed(2)}`);

  const aggregatePass =
    aggregate.consistency >= THRESHOLDS.consistency &&
    aggregate.planAdherence >= THRESHOLDS.planAdherence &&
    aggregate.prohibitedViolation <= THRESHOLDS.prohibitedViolation &&
    aggregate.kpiAlignment >= THRESHOLDS.kpiAlignment &&
    aggregate.overall >= THRESHOLDS.overall;

  if (failed.length > 0 || !aggregatePass) {
    console.error("\nAI quality gate failed.");
    if (failed.length > 0) {
      console.error(`failed cases: ${failed.map((r) => r.id).join(", ")}`);
    }
    process.exit(1);
  }

  console.log("\nAI quality gate passed.");
}

main();
