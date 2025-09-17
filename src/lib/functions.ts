// import { httpsCallable } from 'firebase/functions';
// import { functions } from './firebase';

// Cloud Functions を呼び出すためのヘルパー関数

// Hello World 関数を呼び出す（HTTP関数の場合は直接fetch）
export const callHelloWorld = async () => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL || 
      (process.env.NODE_ENV === 'development' 
        ? 'http://127.0.0.1:5001/signal-v1-fc481/us-central1'
        : 'https://us-central1-signal-v1-fc481.cloudfunctions.net');
    
    const response = await fetch(`${baseUrl}/helloWorld`);
    const data = await response.text();
    return data;
  } catch (error) {
    console.error('Error calling helloWorld:', error);
    throw error;
  }
};

// API 関数を呼び出す
export const callApi = async (method: 'GET' | 'POST' = 'GET', body?: Record<string, unknown>) => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL || 
      (process.env.NODE_ENV === 'development' 
        ? 'http://127.0.0.1:5001/signal-v1-fc481/us-central1'
        : 'https://us-central1-signal-v1-fc481.cloudfunctions.net');
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}/api`, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling api:', error);
    throw error;
  }
};

// Callable Functions の例（将来的に使用）
// export const exampleCallableFunction = httpsCallable(functions, 'exampleCallable');

// 使用例:
// const result = await exampleCallableFunction({ message: 'Hello' });
