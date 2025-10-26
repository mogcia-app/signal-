/**
 * Date Utils Test Suite
 * 日付関連のユーティリティ関数のテスト例
 */

// サンプルの日付フォーマット関数（実際のコードがある場合はそれを使用）
function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getDaysBetween(startDate: Date, endDate: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneDay));
}

describe('Date Utils', () => {
  describe('formatDate', () => {
    test('should format date correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDate(date);
      expect(formatted).toContain('2024年');
      expect(formatted).toContain('1月');
      expect(formatted).toContain('15');
    });

    test('should handle different dates', () => {
      const date = new Date('2024-12-25');
      const formatted = formatDate(date);
      expect(formatted).toContain('2024年');
      expect(formatted).toContain('12月');
    });
  });

  describe('isToday', () => {
    test('should return true for today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    test('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    test('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('getDaysBetween', () => {
    test('should calculate days correctly', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-08');
      expect(getDaysBetween(start, end)).toBe(7);
    });

    test('should handle same day', () => {
      const date = new Date('2024-01-01');
      expect(getDaysBetween(date, date)).toBe(0);
    });

    test('should handle reversed dates', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-10');
      expect(getDaysBetween(end, start)).toBe(getDaysBetween(start, end));
    });
  });
});

