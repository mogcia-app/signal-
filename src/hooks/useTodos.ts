import { useState, useEffect, useCallback } from 'react';
import { todosApi } from '../lib/api';

interface TodoItem {
  id: string;
  userId: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const useTodos = (userId: string) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODOリスト取得
  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await todosApi.list(userId);
      setTodos(response.todos || []);
    } catch (err) {
      console.error('TODOリスト取得エラー:', err);
      setError('TODOリストの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // TODOアイテム作成
  const createTodo = async (task: string, priority: 'high' | 'medium' | 'low', dueDate: string) => {
    try {
      setError(null);
      await todosApi.create({
        userId,
        task,
        priority,
        dueDate,
      });
      await fetchTodos(); // リストを再取得
    } catch (err) {
      console.error('TODO作成エラー:', err);
      setError('TODOアイテムの作成に失敗しました。');
      throw err;
    }
  };

  // TODOアイテム更新
  const updateTodo = async (id: string, updateData: {
    task?: string;
    priority?: 'high' | 'medium' | 'low';
    dueDate?: string;
    completed?: boolean;
  }) => {
    try {
      setError(null);
      await todosApi.update(id, updateData);
      await fetchTodos(); // リストを再取得
    } catch (err) {
      console.error('TODO更新エラー:', err);
      setError('TODOアイテムの更新に失敗しました。');
      throw err;
    }
  };

  // TODOアイテム削除
  const deleteTodo = async (id: string) => {
    try {
      setError(null);
      await todosApi.delete(id);
      await fetchTodos(); // リストを再取得
    } catch (err) {
      console.error('TODO削除エラー:', err);
      setError('TODOアイテムの削除に失敗しました。');
      throw err;
    }
  };

  // 完了状態の切り替え
  const toggleComplete = async (id: string, completed: boolean) => {
    await updateTodo(id, { completed });
  };

  // 初期読み込み
  useEffect(() => {
    if (userId) {
      fetchTodos();
    }
  }, [userId, fetchTodos]);

  return {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    refetch: fetchTodos,
  };
};
