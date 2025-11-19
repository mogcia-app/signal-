"use client";

import React, { useMemo, useState } from "react";
import { ArrowUpRight, Loader2, Target } from "lucide-react";
import { actionLogsApi } from "@/lib/api";
import type { AIActionLog } from "@/types/ai";

type PlanContextHint = {
  targetAudience?: string | null;
  brandConcept?: string | null;
  tone?: string | null;
};

type ActionTemplate = "photos" | "video" | "hashtag" | "engagement" | "campaign" | "default";

const ACTION_TEMPLATE_MAP: Array<{ keyword: RegExp; template: ActionTemplate }> = [
  { keyword: /写真|フォト|ギャラリー/i, template: "photos" },
  { keyword: /動画|リール|ムービー|ショート/i, template: "video" },
  { keyword: /ハッシュタグ|タグ|#|キーワード/i, template: "hashtag" },
  { keyword: /保存|コメント|エンゲージ|反応|顧客|コミュニケーション/i, template: "engagement" },
  { keyword: /キャンペーン|告知|お知らせ|LP|申込|応募/i, template: "campaign" },
];

function getActionTemplate(title: string): ActionTemplate {
  const match = ACTION_TEMPLATE_MAP.find((item) => item.keyword.test(title));
  return match ? match.template : "default";
}

function getAudienceLabel(context?: PlanContextHint) {
  return context?.targetAudience && context.targetAudience !== "未設定"
    ? context.targetAudience
    : "想定オーディエンス";
}

function getBrandLabel(context?: PlanContextHint) {
  return context?.brandConcept && context.brandConcept.trim().length > 0
    ? context.brandConcept
    : "ブランド";
}

function getToneLabel(context?: PlanContextHint) {
  return context?.tone && context.tone.trim().length > 0 ? context.tone : "";
}

function buildFallbackReason(title: string, context?: PlanContextHint) {
  const template = getActionTemplate(title);
  const audience = getAudienceLabel(context);
  const brand = getBrandLabel(context);
  const describeVoice = getToneLabel(context) ? `${context?.tone}トーンで` : "";

  switch (template) {
    case "photos":
      return `${brand} のフォト投稿は「撮影シーン → ひとことコメント → CTA」の流れにすると ${audience} に刺さりやすく、保存率を測りやすくなります。`;
    case "video":
      return `リール施策は冒頭3秒でベネフィットを映し、${describeVoice || "自然体で"}CTAを字幕にも入れると、完走率が上がり次月のアクションが計測しやすくなります。`;
    case "hashtag":
      return `ハッシュタグ改善は「ブランド専用タグ + 競合タグ + 課題ワード」の3層構成にすると ${audience} への到達が安定します。`;
    case "engagement":
      return `保存やコメントを増やしたいときは、本文末に「あなたの○○を教えてください」など答えやすい問いを必ず入れ、${brand} らしい共感パターンを蓄積しましょう。`;
    case "campaign":
      return `キャンペーン/告知系は「◯日まで」「先着◯名」などの制限を書き、CTAボタンの前にベネフィットを並べると、${audience} の行動率が安定します。`;
    default:
      return `このアクションはAIが学習中です。Labで実験した内容を分析ページに登録すると、来月の優先度がより精密になります。`;
  }
}

function buildFallbackRecommendation(title: string, context?: PlanContextHint) {
  const template = getActionTemplate(title);
  const audience = getAudienceLabel(context);
  const brand = getBrandLabel(context);

  switch (template) {
    case "photos":
      return `1) 週間で最も反応が良かった写真を選定\n2) キャプション冒頭に撮影理由を一文で\n3) CTAに「アルバム保存」や「詳しくはプロフィール」など行動を記述`;
    case "video":
      return `1) 開始3秒で結論を表示\n2) ${audience} の課題→解決策をテロップ化\n3) エンドカードに「${brand} の世界観をもっと見る」などのCTAを配置`;
    case "hashtag":
      return `1) ブランド固有タグを固定化\n2) 競合が伸びているタグを3つまで追加\n3) ${audience} の悩みワード(例: #◯◯で悩む)を1つ入れてABテスト`;
    case "engagement":
      return `1) 投稿末尾に「教えてください」「○○派？」など質問を入れる\n2) 保存したくなるチェックリストを載せる\n3) コメントに返信テンプレを用意し24h以内に返す`;
    case "campaign":
      return `1) 見出しに「◯月◯日まで」など締切を明記\n2) CTAボタン前にベネフィットを箇条書き\n3) プロフィールリンクにキャンペーンLPを固定`;
    default:
      return `1) LabでAI提案を再生成\n2) 分析ページに結果を登録\n3) KPIコンソールで差分を確認して次の優先度を更新`;
  }
}

export type NextMonthFocusAction = {
  id: string;
  title: string;
  focusKPI: string;
  reason: string;
  recommendedAction: string;
  referenceIds?: string[];
};

interface NextMonthFocusActionsProps {
  actions?: NextMonthFocusAction[];
  userId?: string;
  periodKey?: string;
  existingLogs?: AIActionLog[];
  onActionLogged?: (log: AIActionLog) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  planContext?: {
    targetAudience?: string | null;
    brandConcept?: string | null;
    tone?: string | null;
  };
}

export function NextMonthFocusActions({
  actions,
  userId,
  periodKey,
  existingLogs,
  onActionLogged,
  isLoading = false,
  errorMessage,
  planContext,
}: NextMonthFocusActionsProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const logMap = useMemo(() => {
    const map = new Map<string, AIActionLog>();
    (existingLogs || []).forEach((log) => map.set(log.actionId, log));
    return map;
  }, [existingLogs]);

  if (!actions || actions.length === 0) {
    return null;
  }

  const focusArea = periodKey ? `next-month-${periodKey}` : "next-month";

  const handleToggle = async (action: NextMonthFocusAction, applied: boolean) => {
    if (!userId) {
      setLocalError("アクションを更新するにはログインが必要です。");
      return;
    }

    const actionId = `${focusArea}-${action.id}`;
    setPendingId(actionId);
    setLocalError(null);

    try {
      await actionLogsApi.upsert({
        userId,
        actionId,
        title: action.title,
        focusArea,
        applied,
      });

      const existing = logMap.get(actionId);
      const updated: AIActionLog = {
        id: existing?.id ?? `${userId}_${actionId}`,
        actionId,
        title: action.title,
        focusArea,
        applied,
        resultDelta: existing?.resultDelta ?? null,
        feedback: existing?.feedback ?? "",
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onActionLogged?.(updated);
    } catch (error) {
      console.error("Failed to update action log", error);
      setLocalError("アクションの更新に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm mb-6">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-slate-600" />
            <h2 className="text-lg font-semibold text-black">翌月フォーカスアクション</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            KPIの増減と成功/改善パターンから次に着手すべきテーマを自動で抽出しました。
          </p>
        </div>
        {(isLoading || pendingId) && (
          <div className="flex items-center text-sm text-slate-500">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            更新中...
          </div>
        )}
      </div>

      {(errorMessage || localError) && (
        <div className="text-sm text-rose-600 mb-4">{localError || errorMessage}</div>
      )}

      <div className="space-y-4">
        {actions.map((action) => {
          const actionId = `${focusArea}-${action.id}`;
          const log = logMap.get(actionId);
          const checked = Boolean(log?.applied);
          const updatedLabel =
            log?.updatedAt && !Number.isNaN(Date.parse(log.updatedAt))
              ? new Date(log.updatedAt).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                })
              : null;

          const reasonText =
            action.reason && action.reason.trim().length > 0
              ? action.reason
              : buildFallbackReason(action.title, planContext);
          const recommendationText =
            action.recommendedAction && action.recommendedAction.trim().length > 0
              ? action.recommendedAction
              : buildFallbackRecommendation(action.title, planContext);

          return (
            <div key={action.id} className="border border-slate-200 rounded-none p-4 bg-slate-50">
              <div className="flex items-start gap-3 mb-2">
                <div className="mt-0.5">
                  <ArrowUpRight className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {String(action.title || "")
                      .replace(/<[^>]*>/g, "")
                      .replace(/&lt;/g, "<")
                      .replace(/&gt;/g, ">")
                      .replace(/&amp;/g, "&")}
                  </p>
                  <p className="text-[11px] text-slate-500">フォーカスKPI: {action.focusKPI}</p>
                </div>
              </div>
              <p
                className="text-xs text-slate-600 mb-2 whitespace-pre-line"
                dangerouslySetInnerHTML={{
                  __html: String(reasonText || ""),
                }}
              />
              <div
                className="text-sm text-slate-800 bg-white border border-slate-200 rounded-none p-3"
                dangerouslySetInnerHTML={{
                  __html: String(recommendationText || ""),
                }}
              />
              {action.referenceIds?.length ? (
                <p className="text-[11px] text-slate-500 mt-2">
                  参考投稿: {action.referenceIds.join(", ")}
                </p>
              ) : null}
              <div className="flex items-center gap-3 mt-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-400"
                    checked={checked}
                    disabled={!userId || pendingId === actionId}
                    onChange={(event) => handleToggle(action, event.target.checked)}
                  />
                  <span>{checked ? "実行済み" : "未実行"}</span>
                </label>
                {pendingId === actionId && (
                  <span className="text-xs text-slate-500">更新中...</span>
                )}
                {checked && updatedLabel && (
                  <span className="text-[11px] text-slate-500">最終更新: {updatedLabel}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
