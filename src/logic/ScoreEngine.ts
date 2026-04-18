/**
 * ScoreEngine.ts - 分数引擎
 *
 * 负责计算匹配得分、连击判定、时间奖励和关卡总分。
 * 纯函数实现，零浏览器/DOM/Canvas 依赖。
 *
 * 计分规则：
 * - 基础分：100
 * - 连击倍数：score = 100 × comboChain（comboChain 从 1 开始）
 * - 时间奖励：max(0, (bonusTimeThreshold - elapsedMs) / 1000) × 50
 */

/**
 * 计算一次匹配的得分
 *
 * @param comboChain - 当前连击链长度（从 1 开始）
 * @returns 本次匹配获得的分数
 *
 * 计算公式：100 × comboChain
 * - comboChain = 1：基础分 100
 * - comboChain = 2：200 分
 * - comboChain = 3：300 分
 * - ...以此类推
 */
export function calculateMatchScore(comboChain: number): number {
  const BASE_SCORE = 100;
  return BASE_SCORE * Math.max(1, Math.floor(comboChain));
}

/**
 * 判断是否在连击窗口内
 *
 * @param lastMatchTime - 上次匹配成功的时间戳（ms）
 * @param currentTime - 当前时间戳（ms）
 * @param comboWindowMs - 连击窗口时长（ms）
 * @returns 两次匹配的间隔是否在连击窗口内
 */
export function isInComboWindow(
  lastMatchTime: number,
  currentTime: number,
  comboWindowMs: number,
): boolean {
  if (lastMatchTime <= 0) return false;
  const elapsed = currentTime - lastMatchTime;
  return elapsed >= 0 && elapsed <= comboWindowMs;
}

/**
 * 计算时间奖励
 *
 * 在奖励时间阈值内完成关卡，剩余时间越多奖励越高。
 *
 * @param elapsedMs - 实际耗时（ms）
 * @param bonusTimeThreshold - 奖励时间阈值（ms）
 * @returns 时间奖励分数（非负整数）
 *
 * 计算公式：max(0, (bonusTimeThreshold - elapsedMs) / 1000) × 50
 */
export function calculateTimeBonus(
  elapsedMs: number,
  bonusTimeThreshold: number,
): number {
  const remainingSeconds = (bonusTimeThreshold - elapsedMs) / 1000;
  return Math.max(0, Math.floor(remainingSeconds * 50));
}

/**
 * 计算关卡总分
 *
 * @param matchScores - 所有匹配操作的得分数组
 * @param timeBonus - 时间奖励分数
 * @returns 关卡最终总分
 */
export function calculateTotalScore(
  matchScores: number[],
  timeBonus: number,
): number {
  const matchTotal = matchScores.reduce((sum, score) => sum + score, 0);
  return matchTotal + Math.max(0, timeBonus);
}
