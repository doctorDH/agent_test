/**
 * DifficultyAgent.ts - 难度评估 Agent
 * 跟踪玩家表现（配对速度、错误率、连击率），评估当前难度是否匹配
 */

import type {
  IGameAgent,
  AgentContext,
  AgentRequest,
  AgentResponse,
  AgentEvent,
} from '../types/agents';
import { AgentEventType } from '../types/agents';
import type { GameSession } from '../types/session';

/** 难度评估结果 */
type DifficultyLevel = 'too_easy' | 'balanced' | 'too_hard';

/** 评估阈值 */
const FAST_PAIR_MS = 3000;    // 配对间隔小于 3 秒算"快"
const SLOW_PAIR_MS = 15000;   // 配对间隔大于 15 秒算"慢"
const ASSESS_INTERVAL_MS = 30000; // 每 30 秒自动评估一次

export class DifficultyAgent implements IGameAgent {
  readonly name = 'DifficultyAgent';

  private emitEvent: ((event: AgentEvent) => void) | null = null;

  /** 跟踪统计 */
  private lastMatchCount = 0;
  private lastMatchElapsed = 0;
  private pairIntervals: number[] = [];
  private lastAssessElapsed = 0;

  initialize(context: AgentContext): void {
    this.emitEvent = context.emitEvent;
    this.lastMatchCount = context.session.matchCount;
    this.lastMatchElapsed = context.session.elapsedMs;
    this.pairIntervals = [];
    this.lastAssessElapsed = 0;
    console.log('[DifficultyAgent] 初始化完成，评估间隔:', ASSESS_INTERVAL_MS, 'ms');
  }

  update(session: GameSession, _delta: number): void {
    if (session.status !== 'playing') return;

    // 记录配对间隔
    if (session.matchCount > this.lastMatchCount) {
      const interval = session.elapsedMs - this.lastMatchElapsed;
      this.pairIntervals.push(interval);
      this.lastMatchCount = session.matchCount;
      this.lastMatchElapsed = session.elapsedMs;
    }

    // 定期自动评估
    if (session.elapsedMs - this.lastAssessElapsed >= ASSESS_INTERVAL_MS) {
      this.lastAssessElapsed = session.elapsedMs;
      const assessment = this.assess(session);
      this.emitEvent?.({
        type: AgentEventType.DifficultyAdjustment,
        payload: assessment,
        timestamp: Date.now(),
      });
    }
  }

  query(request: AgentRequest): AgentResponse {
    if (request.action === 'assess') {
      const session = request.params['session'] as GameSession | undefined;
      if (!session) {
        return { success: false, data: null, error: 'session is required' };
      }
      return {
        success: true,
        data: this.assess(session),
      };
    }

    return { success: false, data: null, error: `Unknown action: ${request.action}` };
  }

  dispose(): void {
    this.emitEvent = null;
    this.pairIntervals = [];
  }

  /** 综合评估难度匹配度 */
  private assess(session: GameSession): {
    difficulty: DifficultyLevel;
    avgPairInterval: number;
    comboRate: number;
    hintUsageRate: number;
    reason: string;
  } {
    // 平均配对间隔
    const avgInterval = this.pairIntervals.length > 0
      ? this.pairIntervals.reduce((a, b) => a + b, 0) / this.pairIntervals.length
      : 0;

    // 连击率 = 最大连击 / 总配对数
    const comboRate = session.matchCount > 0
      ? session.maxCombo / session.matchCount
      : 0;

    // 提示使用率 = 已使用提示次数 / 总配对数
    const totalHints = session.hintsRemaining; // 剩余提示
    const hintUsageRate = session.matchCount > 0
      ? (session.matchCount > 0 ? 1 - (totalHints / (totalHints + session.matchCount)) : 0)
      : 0;

    // 综合判定
    let difficulty: DifficultyLevel = 'balanced';
    let reason = '玩家表现与难度匹配';

    const fastPairs = this.pairIntervals.filter(i => i < FAST_PAIR_MS).length;
    const slowPairs = this.pairIntervals.filter(i => i > SLOW_PAIR_MS).length;
    const totalPairs = this.pairIntervals.length;

    if (totalPairs >= 3) {
      if (fastPairs / totalPairs > 0.7 && comboRate > 0.3) {
        difficulty = 'too_easy';
        reason = `配对速度快（${Math.round(avgInterval)}ms），连击率高（${(comboRate * 100).toFixed(0)}%）`;
      } else if (slowPairs / totalPairs > 0.5 || hintUsageRate > 0.3) {
        difficulty = 'too_hard';
        reason = `配对速度慢（${Math.round(avgInterval)}ms）或提示使用频繁（${(hintUsageRate * 100).toFixed(0)}%）`;
      }
    }

    return {
      difficulty,
      avgPairInterval: Math.round(avgInterval),
      comboRate: Math.round(comboRate * 100) / 100,
      hintUsageRate: Math.round(hintUsageRate * 100) / 100,
      reason,
    };
  }
}
