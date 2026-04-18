/**
 * index.ts - 类型统一导出入口
 * 所有外部模块应从此文件导入类型
 */

// 牌相关类型
export {
  TileSuit,
  TileState,
  type TileType,
  type TilePosition,
  type Tile,
} from './tile';

// 棋盘相关类型
export {
  type BoardConfig,
  type BoardState,
  type MoveRecord,
} from './board';

// 游戏会话类型
export {
  type GameStatus,
  type GameSession,
  type LevelStats,
} from './session';

// 玩家数据类型
export {
  type Language,
  type PlayerSettings,
  type PlayerProgress,
} from './player';

// 关卡定义类型
export {
  type DifficultyParams,
  type LevelDefinition,
} from './level';

// 场景系统类型
export {
  SceneType,
  type IScene,
  type SceneTransition,
} from './scene';

// 事件系统类型
export {
  type GameEvent,
  type GameEventType,
  type TileSelectedEvent,
  type TileDeselectedEvent,
  type MatchMadeEvent,
  type MatchFailedEvent,
  type ComboUpdatedEvent,
  type BoardChangedEvent,
  type ShuffleUsedEvent,
  type HintUsedEvent,
  type LevelCompleteEvent,
  type LevelFailedEvent,
  type SceneChangeEvent,
  type PointerDownEvent,
  type PointerUpEvent,
  type EventByType,
  type EventListener,
  type IEventBus,
} from './events';

// Agent 系统类型
export {
  AgentEventType,
  type AgentEvent,
  type AgentRequest,
  type AgentResponse,
  type AgentContext,
  type IGameAgent,
} from './agents';
