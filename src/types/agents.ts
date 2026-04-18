/**
 * agents.ts - 游戏内 Agent 接口（Phase 5 预留）
 * 定义 AI Agent 的请求/响应协议和生命周期接口
 */

import type { GameSession } from './session';

// ─── Agent 事件类型 ─────────────────────────────

/** Agent 事件类型枚举 */
export enum AgentEventType {
  /** Agent 提供提示建议 */
  HintSuggestion = 'hint_suggestion',
  /** Agent 提供难度调整建议 */
  DifficultyAdjustment = 'difficulty_adjustment',
  /** Agent 分析玩家行为模式 */
  PatternAnalysis = 'pattern_analysis',
  /** Agent 触发特殊效果 */
  SpecialEffect = 'special_effect',
}

/** Agent 事件 */
export interface AgentEvent {
  /** 事件类型 */
  type: AgentEventType;
  /** 事件负载数据 */
  payload: unknown;
  /** 事件时间戳 */
  timestamp: number;
}

// ─── Agent 请求/响应 ────────────────────────────

/** Agent 请求类型 */
export interface AgentRequest {
  /** 请求动作标识 */
  action: string;
  /** 请求参数 */
  params: Record<string, unknown>;
  /** 请求发起时间 */
  timestamp: number;
}

/** Agent 响应类型 */
export interface AgentResponse {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data: unknown;
  /** 错误信息（失败时） */
  error?: string;
}

// ─── Agent 上下文 ───────────────────────────────

/** Agent 初始化时接收的上下文 */
export interface AgentContext {
  /** 当前游戏会话 */
  session: GameSession;
  /** 向宿主发送事件的回调 */
  emitEvent: (event: AgentEvent) => void;
}

// ─── Agent 接口 ─────────────────────────────────

/** 游戏内 Agent 的标准接口 */
export interface IGameAgent {
  /** Agent 名称标识 */
  readonly name: string;
  /** 初始化 Agent，注入上下文 */
  initialize(context: AgentContext): void;
  /** 每帧更新，可访问游戏状态 */
  update(state: GameSession, delta: number): void;
  /** 查询 Agent（请求/响应模式） */
  query(request: AgentRequest): AgentResponse | Promise<AgentResponse>;
  /** 销毁 Agent，释放资源 */
  dispose(): void;
}
