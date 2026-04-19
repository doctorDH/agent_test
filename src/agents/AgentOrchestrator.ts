/**
 * AgentOrchestrator.ts - Agent 编排器
 * 统一管理游戏内 Agent 的注册、初始化、更新、查询和销毁
 */

import type {
  IGameAgent,
  AgentContext,
  AgentRequest,
  AgentResponse,
} from '../types/agents';
import type { GameSession } from '../types/session';

export class AgentOrchestrator {
  private agents: IGameAgent[] = [];
  private initialized = false;

  /** 注册一个 Agent */
  registerAgent(agent: IGameAgent): void {
    this.agents.push(agent);
  }

  /** 初始化所有已注册的 Agent */
  initializeAll(context: AgentContext): void {
    for (const agent of this.agents) {
      agent.initialize(context);
    }
    this.initialized = true;
  }

  /** 每帧更新所有 Agent */
  updateAll(session: GameSession, delta: number): void {
    if (!this.initialized) return;
    for (const agent of this.agents) {
      agent.update(session, delta);
    }
  }

  /** 按名称查询 Agent */
  queryAgent(name: string, request: AgentRequest): AgentResponse | Promise<AgentResponse> {
    const agent = this.agents.find(a => a.name === name);
    if (!agent) {
      return { success: false, data: null, error: `Agent "${name}" not found` };
    }
    return agent.query(request);
  }

  /** 销毁所有 Agent，释放资源 */
  disposeAll(): void {
    for (const agent of this.agents) {
      agent.dispose();
    }
    this.agents = [];
    this.initialized = false;
  }
}
