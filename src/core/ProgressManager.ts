/**
 * ProgressManager.ts - 玩家进度管理器
 * 封装关卡解锁、最高分、最佳时间的持久化存储
 */

import { Storage } from './Storage';
import type { PlayerProgress, PlayerSettings } from '../types/player';
import type { Tile, TilePosition, TileType } from '../types/tile';
import { TileState } from '../types/tile';
import type { BoardConfig, BoardState } from '../types/board';
import type { GameSession } from '../types/session';

const STORAGE_KEY = 'vita_mahjong_progress';
const SAVE_KEY = 'vita_mahjong_save';

const DEFAULT_SETTINGS: PlayerSettings = {
  musicEnabled: true,
  soundEnabled: true,
  language: 'zh',
};

const DEFAULT_PROGRESS: PlayerProgress = {
  currentLevel: 1,
  highScores: {},
  bestTimes: {},
  totalGamesPlayed: 0,
  totalGamesWon: 0,
  settings: DEFAULT_SETTINGS,
  nickname: '',
  avatarId: 0,
  frameId: 0,
  customAvatarDataUrl: '',
};

export class ProgressManager {
  private storage: Storage;
  private progress: PlayerProgress;

  constructor() {
    this.storage = new Storage();
    this.progress = this.storage.load<PlayerProgress>(STORAGE_KEY, { ...DEFAULT_PROGRESS });
  }

  /** 获取完整进度数据 */
  getProgress(): PlayerProgress {
    return this.progress;
  }

  /** 获取已解锁的最高关卡号 */
  getUnlockedLevel(): number {
    return this.progress.currentLevel;
  }

  /** 判断某关卡是否已解锁 */
  isLevelUnlocked(levelId: number): boolean {
    return levelId <= this.progress.currentLevel;
  }

  /** 判断某关卡是否已通关（有最高分记录） */
  isLevelCompleted(levelId: number): boolean {
    return (this.progress.highScores[levelId] ?? 0) > 0;
  }

  /** 获取某关卡最高分 */
  getHighScore(levelId: number): number {
    return this.progress.highScores[levelId] ?? 0;
  }

  /** 获取某关卡最佳用时（ms），无记录返回 0 */
  getBestTime(levelId: number): number {
    return this.progress.bestTimes[levelId] ?? 0;
  }

  /** 记录通关：更新解锁、最高分、最佳时间、统计 */
  recordLevelComplete(levelId: number, score: number, timeMs: number): void {
    // 解锁下一关
    if (levelId >= this.progress.currentLevel) {
      this.progress.currentLevel = levelId + 1;
    }

    // 更新最高分
    const prevScore = this.progress.highScores[levelId] ?? 0;
    if (score > prevScore) {
      this.progress.highScores[levelId] = score;
    }

    // 更新最佳时间（越短越好）
    const prevTime = this.progress.bestTimes[levelId] ?? 0;
    if (prevTime === 0 || timeMs < prevTime) {
      this.progress.bestTimes[levelId] = timeMs;
    }

    // 统计
    this.progress.totalGamesPlayed++;
    this.progress.totalGamesWon++;

    this.save();
  }

  /** 记录一局游戏（不论输赢） */
  recordGamePlayed(): void {
    this.progress.totalGamesPlayed++;
    this.save();
  }

  /** 获取设置 */
  getSettings(): PlayerSettings {
    return this.progress.settings;
  }

  /** 更新设置 */
  updateSettings(settings: Partial<PlayerSettings>): void {
    this.progress.settings = { ...this.progress.settings, ...settings };
    this.save();
  }

  // ─── 个人资料 ─────────────────────────────────────

  /** 更新个人资料（昵称/头像/头像框/自定义头像） */
  updateProfile(data: Partial<Pick<PlayerProgress, 'nickname' | 'avatarId' | 'frameId' | 'customAvatarDataUrl'>>): void {
    if (data.nickname !== undefined) this.progress.nickname = data.nickname;
    if (data.avatarId !== undefined) this.progress.avatarId = data.avatarId;
    if (data.frameId !== undefined) this.progress.frameId = data.frameId;
    if (data.customAvatarDataUrl !== undefined) this.progress.customAvatarDataUrl = data.customAvatarDataUrl;
    this.save();
  }

  /** 生成随机默认昵称 */
  generateDefaultNickname(): string {
    const adjectives = ['智慧', '勇敢', '敏捷', '优雅', '快乐', '幸运', '冷静', '神秘'];
    const nouns = ['麻雀', '凤凰', '飞龙', '白虎', '青龙', '独角兽', '小猫', '星辰'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
  }

  // ─── 中途存档 ─────────────────────────────────────

  /** 保存游戏会话（中途退出时调用） */
  saveGameSession(session: GameSession): void {
    const serialized: SerializedGameSave = {
      levelId: session.levelId,
      tiles: Array.from(session.board.tiles.values()).map(t => ({
        id: t.id,
        type: t.type,
        position: t.position,
        state: t.state,
      })),
      boardConfig: session.board.config,
      selectedTileId: session.board.selectedTileId,
      removedCount: session.board.removedCount,
      totalCount: session.board.totalCount,
      score: session.score,
      matchCount: session.matchCount,
      comboChain: session.comboChain,
      maxCombo: session.maxCombo,
      elapsedMs: session.elapsedMs,
      shufflesRemaining: session.shufflesRemaining,
      hintsRemaining: session.hintsRemaining,
    };
    this.storage.save(SAVE_KEY, serialized);
  }

  /** 加载存档（返回 null 表示无存档或 levelId 不匹配） */
  loadGameSave(levelId: number): SerializedGameSave | null {
    const save = this.storage.load<SerializedGameSave | null>(SAVE_KEY, null);
    if (!save || save.levelId !== levelId) return null;
    return save;
  }

  /** 清除存档 */
  clearGameSave(): void {
    this.storage.remove(SAVE_KEY);
  }

  private save(): void {
    this.storage.save(STORAGE_KEY, this.progress);
  }
}

/** 序列化的游戏存档数据 */
export interface SerializedGameSave {
  levelId: number;
  tiles: Array<{
    id: number;
    type: TileType;
    position: TilePosition;
    state: TileState;
  }>;
  boardConfig: BoardConfig;
  selectedTileId: number | null;
  removedCount: number;
  totalCount: number;
  score: number;
  matchCount: number;
  comboChain: number;
  maxCombo: number;
  elapsedMs: number;
  shufflesRemaining: number;
  hintsRemaining: number;
}
