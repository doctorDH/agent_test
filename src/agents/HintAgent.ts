/**
 * HintAgent.ts - 智能提示 Agent
 * 监测玩家空闲时间，超过阈值后自动发送配对提示建议
 * 支持 query 模式主动获取最优配对
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
import { findAllFreePairs } from '../logic/MatchingEngine';

/** 空闲多久后自动提示（ms） */
const IDLE_THRESHOLD_MS = 10000;

export class HintAgent implements IGameAgent {
  readonly name = 'HintAgent';

  private emitEvent: ((event: AgentEvent) => void) | null = null;
  /** 上次配对发生的时间戳（用 session.elapsedMs 跟踪） */
  private lastMatchCount = 0;
  private lastMatchElapsed = 0;
  /** 是否已经对本次空闲发送过提示 */
  private hintSentForIdle = false;

  initialize(context: AgentContext): void {
    this.emitEvent = context.emitEvent;
    this.lastMatchCount = context.session.matchCount;
    this.lastMatchElapsed = context.session.elapsedMs;
    this.hintSentForIdle = false;
  }

  update(session: GameSession, _delta: number): void {
    if (session.status !== 'playing') return;

    // 检测是否有新的配对发生
    if (session.matchCount !== this.lastMatchCount) {
      this.lastMatchCount = session.matchCount;
      this.lastMatchElapsed = session.elapsedMs;
      this.hintSentForIdle = false; // 重置空闲提示标记
      return;
    }

    // 空闲检测：距上次配对超过阈值
    const idleTime = session.elapsedMs - this.lastMatchElapsed;
    if (idleTime >= IDLE_THRESHOLD_MS && !this.hintSentForIdle) {
      this.hintSentForIdle = true;
      const pairs = findAllFreePairs(session.board);
      if (pairs.length > 0) {
        // 发送提示建议事件
        this.emitEvent?.({
          type: AgentEventType.HintSuggestion,
          payload: {
            pair: pairs[0],
            totalAvailable: pairs.length,
            idleMs: idleTime,
          },
          timestamp: Date.now(),
        });
      }
    }
  }

  query(request: AgentRequest): AgentResponse {
    if (request.action === 'get_hint') {
      const session = request.params['session'] as GameSession | undefined;
      if (!session) {
        return { success: false, data: null, error: 'session is required' };
      }

      const pairs = findAllFreePairs(session.board);
      if (pairs.length === 0) {
        return { success: false, data: null, error: 'No available pairs' };
      }

      // 策略：优先返回包含高层牌的配对（消除阻塞）
      const bestPair = this.selectBestPair(pairs, session);
      return {
        success: true,
        data: {
          pair: bestPair,
          totalAvailable: pairs.length,
        },
      };
    }

    return { success: false, data: null, error: `Unknown action: ${request.action}` };
  }

  dispose(): void {
    this.emitEvent = null;
  }

  /** 选择最优配对：优先高层牌 */
  private selectBestPair(
    pairs: [number, number][],
    session: GameSession,
  ): [number, number] {
    let bestPair = pairs[0];
    let bestScore = -1;

    for (const pair of pairs) {
      const tile1 = session.board.tiles.get(pair[0]);
      const tile2 = session.board.tiles.get(pair[1]);
      // 高层牌得分更高，优先消除
      const score = (tile1?.position.layer ?? 0) + (tile2?.position.layer ?? 0);
      if (score > bestScore) {
        bestScore = score;
        bestPair = pair;
      }
    }

    return bestPair;
  }
}
