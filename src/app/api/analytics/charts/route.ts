import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

interface AnalyticsData {
  id: string;
  postId: string;
  userId: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  profileClicks?: number;
  websiteClicks?: number;
  storyViews?: number;
  followerChange?: number;
  publishedAt: Date;
  createdAt: Date;
}

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    fill: boolean;
  }[];
}

// グラフ用データ取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') as 'likes' | 'followers' | 'saves' | 'reach';
    const period = searchParams.get('period') || '7days'; // 7days, 30days, 90days

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // ユーザーの分析データを直接取得
    const analyticsQuery = query(
      collection(db, 'analytics'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const analyticsSnapshot = await getDocs(analyticsQuery);
    const analyticsData: AnalyticsData[] = analyticsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AnalyticsData));

    // 期間に応じてデータをフィルタリング
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const filteredAnalytics = analyticsData.filter(data => 
      new Date(data.publishedAt) >= startDate
    );

    // ラベル生成（期間に応じて）
    const labels: string[] = [];
    const data: number[] = [];
    
    if (period === '7days') {
      // 過去7日間（日別）
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }));
        
        const dayAnalytics = filteredAnalytics.filter(data => {
          const dataDate = new Date(data.publishedAt);
          return dataDate.toDateString() === date.toDateString();
        });

        const dayValue = dayAnalytics.reduce((sum, data) => {
          switch (type) {
            case 'likes': return sum + data.likes;
            case 'followers': return sum + Math.floor(data.likes * 0.1);
            case 'saves': return sum + data.shares;
            case 'reach': return sum + data.reach;
            default: return sum;
          }
        }, 0);
        
        data.push(dayValue);
      }
    } else if (period === '30days') {
      // 過去30日間（週別）
      for (let i = 4; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        
        labels.push(`${weekStart.getMonth() + 1}/${weekStart.getDate()}-${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`);
        
        const weekAnalytics = filteredAnalytics.filter(data => {
          const dataDate = new Date(data.publishedAt);
          return dataDate >= weekStart && dataDate < weekEnd;
        });

        const weekValue = weekAnalytics.reduce((sum, data) => {
          switch (type) {
            case 'likes': return sum + data.likes;
            case 'followers': return sum + Math.floor(data.likes * 0.1);
            case 'saves': return sum + data.shares;
            case 'reach': return sum + data.reach;
            default: return sum;
          }
        }, 0);
        
        data.push(weekValue);
      }
    } else {
      // 過去90日間（月別）
      for (let i = 2; i >= 0; i--) {
        const monthStart = new Date(now);
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        
        labels.push(`${monthStart.getMonth() + 1}月`);
        
        const monthAnalytics = filteredAnalytics.filter(data => {
          const dataDate = new Date(data.publishedAt);
          return dataDate >= monthStart && dataDate < monthEnd;
        });

        const monthValue = monthAnalytics.reduce((sum, data) => {
          switch (type) {
            case 'likes': return sum + data.likes;
            case 'followers': return sum + Math.floor(data.likes * 0.1);
            case 'saves': return sum + data.shares;
            case 'reach': return sum + data.reach;
            default: return sum;
          }
        }, 0);
        
        data.push(monthValue);
      }
    }

    // カラーの設定
    const colors = {
      likes: { border: '#ff8a15', bg: 'rgba(255, 138, 21, 0.1)' },
      followers: { border: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
      saves: { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)' },
      reach: { border: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' }
    };

    const chartData: ChartData = {
      labels,
      datasets: [{
        data,
        borderColor: colors[type]?.border || '#ff8a15',
        backgroundColor: colors[type]?.bg || 'rgba(255, 138, 21, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };

    return NextResponse.json({
      chartData,
      totalValue: data.reduce((sum, val) => sum + val, 0),
      period,
      type,
      message: 'グラフデータを取得しました'
    });

  } catch (error) {
    console.error('グラフデータ取得エラー:', error);
    return NextResponse.json(
      { error: 'グラフデータの取得に失敗しました' },
      { status: 500 }
    );
  }
}
