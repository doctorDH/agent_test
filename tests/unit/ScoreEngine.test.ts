/**
 * ScoreEngine 单元测试
 * 测试匹配得分、连击判定、时间奖励和总分计算
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMatchScore,
  isInComboWindow,
  calculateTimeBonus,
  calculateTotalScore,
} from '../../src/logic/ScoreEngine';

describe('ScoreEngine', () => {
  describe('calculateMatchScore', () => {
    it('单次匹配（comboChain=1）得 100 分', () => {
      expect(calculateMatchScore(1)).toBe(100);
    });

    it('连击 2（comboChain=2）得 200 分', () => {
      expect(calculateMatchScore(2)).toBe(200);
    });

    it('连击 3（comboChain=3）得 300 分', () => {
      expect(calculateMatchScore(3)).toBe(300);
    });

    it('comboChain 为 0 或负数时至少得 100 分（最小 chain=1）', () => {
      expect(calculateMatchScore(0)).toBe(100);
      expect(calculateMatchScore(-1)).toBe(100);
    });

    it('comboChain 为小数时向下取整', () => {
      // Math.floor(2.7) = 2, 100 * 2 = 200
      expect(calculateMatchScore(2.7)).toBe(200);
    });
  });

  describe('isInComboWindow', () => {
    it('在窗口内返回 true', () => {
      const lastTime = 1000;
      const currentTime = 3000; // 间隔 2000ms
      const windowMs = 5000; // 窗口 5000ms
      expect(isInComboWindow(lastTime, currentTime, windowMs)).toBe(true);
    });

    it('在窗口外返回 false', () => {
      const lastTime = 1000;
      const currentTime = 7000; // 间隔 6000ms
      const windowMs = 5000; // 窗口 5000ms
      expect(isInComboWindow(lastTime, currentTime, windowMs)).toBe(false);
    });

    it('恰好在窗口边界返回 true', () => {
      const lastTime = 1000;
      const currentTime = 6000; // 间隔 5000ms = 窗口大小
      const windowMs = 5000;
      expect(isInComboWindow(lastTime, currentTime, windowMs)).toBe(true);
    });

    it('lastMatchTime 为 0 或负数时返回 false', () => {
      expect(isInComboWindow(0, 1000, 5000)).toBe(false);
      expect(isInComboWindow(-1, 1000, 5000)).toBe(false);
    });
  });

  describe('calculateTimeBonus', () => {
    it('在时间内返回正奖励', () => {
      // 阈值 120000ms，实际耗时 60000ms
      // 剩余 = (120000 - 60000) / 1000 = 60 秒
      // 奖励 = 60 * 50 = 3000
      expect(calculateTimeBonus(60000, 120000)).toBe(3000);
    });

    it('超时返回 0', () => {
      // 阈值 120000ms，实际耗时 150000ms
      expect(calculateTimeBonus(150000, 120000)).toBe(0);
    });

    it('恰好用完时间返回 0', () => {
      expect(calculateTimeBonus(120000, 120000)).toBe(0);
    });

    it('耗时为 0 时返回最大奖励', () => {
      // 剩余 = 120000 / 1000 = 120 秒, 奖励 = 120 * 50 = 6000
      expect(calculateTimeBonus(0, 120000)).toBe(6000);
    });
  });

  describe('calculateTotalScore', () => {
    it('正确汇总匹配分数和时间奖励', () => {
      const matchScores = [100, 200, 300]; // 总计 600
      const timeBonus = 500;
      expect(calculateTotalScore(matchScores, timeBonus)).toBe(1100);
    });

    it('空匹配分数数组只返回时间奖励', () => {
      expect(calculateTotalScore([], 500)).toBe(500);
    });

    it('负数时间奖励被限制为 0', () => {
      const matchScores = [100, 200];
      expect(calculateTotalScore(matchScores, -100)).toBe(300);
    });
  });
});
