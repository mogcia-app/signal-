// API呼び出し用のクライアント関数

const API_BASE_URL = '/api';

// 共通のfetch関数
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Firebase認証トークンを取得
  const { auth } = await import('./firebase');
  const user = auth.currentUser;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // 認証トークンがある場合は追加
  if (user) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.warn('認証トークンの取得に失敗しました:', error);
    }
  }

  const defaultOptions: RequestInit = {
    headers,
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
    status?: 'draft' | 'created' | 'scheduled' | 'published';
    imageUrl?: string | null;
    imageData?: string | null;
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
  update: async (id: string, updateData: Record<string, unknown> & {
    imageUrl?: string | null;
    imageData?: string | null;
  }) => {
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

// 分析関連API（最小限版）
export const analyticsApi = {
  // いいね数のみ保存
  create: async (analyticsData: {
    userId: string;
    likes: number;
    publishedAt?: string;
  }) => {
    return apiRequest('/analytics', {
      method: 'POST',
      body: JSON.stringify(analyticsData),
    });
  },

  // 分析データ一覧取得
  list: async (params: {
    userId: string;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.append('userId', params.userId);
    
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

// SNSプロフィール関連API
export const snsProfileApi = {
  // SNSプロフィール更新
  update: async (userId: string, platform: string, profileData: {
    followers?: number;
    subscribers?: number;
    username?: string;
  }) => {
    return apiRequest('/user/sns-profile', {
      method: 'PUT',
      body: JSON.stringify({ userId, platform, profileData }),
    });
  },

  // SNSプロフィール取得
  get: async (userId: string, platform?: string) => {
    const params = new URLSearchParams({ userId });
    if (platform) {
      params.append('platform', platform);
    }
    return apiRequest(`/user/sns-profile?${params.toString()}`);
  }
};
