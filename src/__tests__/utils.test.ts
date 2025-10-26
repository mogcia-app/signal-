/**
 * Utils Test Suite
 * src/lib/utils.ts のテスト
 */

import { cn } from '@/lib/utils';

describe('cn (className utility)', () => {
  test('should merge className strings', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  test('should handle conditional classes', () => {
    const result = cn('foo', false && 'bar', 'baz');
    expect(result).toBe('foo baz');
  });

  test('should handle Tailwind conflicting classes', () => {
    // tailwind-mergeの機能をテスト
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4'); // 最後のpx-4が優先される
  });

  test('should handle undefined and null', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toBe('foo bar');
  });

  test('should handle empty string', () => {
    const result = cn('foo', '', 'bar');
    expect(result).toBe('foo bar');
  });

  test('should handle arrays', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  test('should handle objects for conditional classes', () => {
    const result = cn({ 'text-red-500': true, 'text-blue-500': false });
    expect(result).toBe('text-red-500');
  });
});

