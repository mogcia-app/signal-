// API呼び出し用のクライアント関数

const API_BASE_URL = '/api';

// 共通のfetch関数
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// 投稿関連API
export const postsApi = {
  // 投稿作成
  create: async (postData: {
    userId: string;
    title: string;
    content: string;
    hashtags: string[];
    postType: 'feed' | 'reel' | 'story';
    scheduledDate?: string;
    scheduledTime?: string;
    status?: 'draft' | 'scheduled' | 'published';
  }) => {
    return apiRequest('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  // 投稿一覧取得
  list: async (params: {
    userId?: string;
    status?: string;
    postType?: string;
    limit?: number;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/posts?${searchParams.toString()}`);
  },

  // 特定の投稿取得
  get: async (id: string) => {
    return apiRequest(`/posts/${id}`);
  },

  // 投稿更新
  update: async (id: string, updateData: Record<string, unknown>) => {
    return apiRequest(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  // 投稿削除
  delete: async (id: string) => {
    return apiRequest(`/posts/${id}`, {
      method: 'DELETE',
    });
  },
};

// 計画関連API
export const plansApi = {
  // 計画作成
  create: async (planData: {
    userId: string;
    title: string;
    targetFollowers: number;
    currentFollowers: number;
    planPeriod: string;
    targetAudience: string;
    category: string;
    strategies: string[];
    simulation: Record<string, unknown>;
    aiPersona: Record<string, unknown>;
  }) => {
    return apiRequest('/plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  },

  // 計画一覧取得
  list: async (params: {
    userId?: string;
    limit?: number;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/plans?${searchParams.toString()}`);
  },

  // 特定の計画取得
  get: async (id: string) => {
    return apiRequest(`/plans/${id}`);
  },

  // 計画更新
  update: async (id: string, updateData: Record<string, unknown>) => {
    return apiRequest(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  // 計画削除
  delete: async (id: string) => {
    return apiRequest(`/plans/${id}`, {
      method: 'DELETE',
    });
  },
};

// ユーザー関連API
export const usersApi = {
  // ユーザープロフィール作成
  createProfile: async (userData: {
    userId: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    preferences?: Record<string, unknown>;
    socialAccounts?: Record<string, unknown>;
  }) => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // ユーザープロフィール取得
  getProfile: async (userId: string) => {
    return apiRequest(`/users?userId=${userId}`);
  },

  // ユーザープロフィール更新
  updateProfile: async (userId: string, updateData: Record<string, unknown>) => {
    return apiRequest('/users', {
      method: 'PUT',
      body: JSON.stringify({ userId, ...updateData }),
    });
  },
};

// 分析関連API
export const analyticsApi = {
  // 分析データ取得
  getAnalytics: async (params: {
    userId: string;
    period?: 'daily' | 'weekly' | 'monthly';
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/analytics?${searchParams.toString()}`);
  },
};

// エラーハンドリング用のヘルパー
export const handleApiError = (error: unknown) => {
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
  }
  
  return '予期しないエラーが発生しました。';
};
