/**
 * SoundManager.ts - 音效系统
 *
 * 使用 Web Audio API 程序化生成声音，无需加载音频文件。
 * AudioContext 需用户首次交互后才能 resume。
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  private _enabled = true;

  /** BGM 相关状态 */
  private _musicEnabled = true;
  private bgmNodes: OscillatorNode[] = [];
  private bgmMasterGain: GainNode | null = null;
  private bgmPlaying = false;
  private bgmTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** 音效是否启用 */
  get enabled(): boolean {
    return this._enabled;
  }
  set enabled(val: boolean) {
    this._enabled = val;
  }

  /** 背景音乐是否启用 */
  get musicEnabled(): boolean {
    return this._musicEnabled;
  }
  set musicEnabled(val: boolean) {
    this._musicEnabled = val;
    if (!val) this.stopBGM();
  }

  /**
   * 确保 AudioContext 已创建并处于运行状态。
   * 首次调用可能需要在用户手势回调中触发。
   */
  resume(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** 消除配对音效：短促正弦波 600Hz, 100ms */
  playMatch(): void {
    if (!this.canPlay()) return;
    this.playTone(600, 0.1, 'sine', 0.3);
  }

  /** 连击音效：递增音高双音 */
  playCombo(chain: number): void {
    if (!this.canPlay()) return;
    const baseFreq = 400 + chain * 80;
    this.playTone(baseFreq, 0.08, 'sine', 0.25);
    this.playTone(baseFreq * 1.25, 0.08, 'sine', 0.25, 0.06);
  }

  /** 通关音效：上行琶音 C-E-G-C, 600ms */
  playComplete(): void {
    if (!this.canPlay()) return;
    const notes = [523, 659, 784, 1047]; // C5-E5-G5-C6
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.15, 'sine', 0.25, i * 0.15);
    });
  }

  /** 错误/不匹配音效：低沉嗡声 200Hz, 150ms */
  playError(): void {
    if (!this.canPlay()) return;
    this.playTone(200, 0.15, 'triangle', 0.2);
  }

  /** 点击音效：极短 800Hz, 50ms */
  playClick(): void {
    if (!this.canPlay()) return;
    this.playTone(800, 0.05, 'sine', 0.15);
  }

  // ─── BGM 方法 ──────────────────────────────────────

  /**
   * 启动禅意和弦循环 BGM
   * C 大调分解和弦：C4-E4-G4-C5-G4-E4-C4-G3，每音 2s，16s 一循环
   */
  startBGM(): void {
    if (!this._musicEnabled || this.bgmPlaying) return;
    this.resume();
    if (!this.ctx) return;

    this.bgmPlaying = true;

    // 创建 BGM 主增益节点
    this.bgmMasterGain = this.ctx.createGain();
    this.bgmMasterGain.gain.setValueAtTime(0.10, this.ctx.currentTime);
    this.bgmMasterGain.connect(this.ctx.destination);

    this.scheduleBGMCycle();
  }

  /** 停止 BGM */
  stopBGM(): void {
    this.bgmPlaying = false;
    if (this.bgmTimeoutId !== null) {
      clearTimeout(this.bgmTimeoutId);
      this.bgmTimeoutId = null;
    }
    // 停止所有活跃的振荡器
    for (const osc of this.bgmNodes) {
      try { osc.stop(); } catch { /* 已停止 */ }
    }
    this.bgmNodes = [];
    // 断开主增益
    if (this.bgmMasterGain) {
      this.bgmMasterGain.disconnect();
      this.bgmMasterGain = null;
    }
  }

  /** 暂停 BGM（渐弱到静音） */
  pauseBGM(): void {
    if (!this.bgmMasterGain || !this.ctx) return;
    this.bgmMasterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
  }

  /** 恢复 BGM（渐强回原音量） */
  resumeBGM(): void {
    if (!this.bgmMasterGain || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.bgmMasterGain.gain.linearRampToValueAtTime(0.10, this.ctx.currentTime + 0.5);
  }

  /** 调度一个 BGM 循环 */
  private scheduleBGMCycle(): void {
    if (!this.bgmPlaying || !this.ctx || !this.bgmMasterGain) return;

    // C 大调分解和弦频率 (Hz)
    const notes = [262, 330, 392, 523, 392, 330, 262, 196]; // C4-E4-G4-C5-G4-E4-C4-G3
    const noteDuration = 2; // 每音 2 秒
    const cycleDuration = notes.length * noteDuration; // 16 秒

    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      if (!this.ctx || !this.bgmMasterGain) return;

      const startTime = now + i * noteDuration;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // ADSR 包络：attack 0.3s, sustain, release 0.5s
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(1, startTime + 0.3); // attack
      gain.gain.setValueAtTime(1, startTime + noteDuration - 0.5); // sustain end
      gain.gain.linearRampToValueAtTime(0, startTime + noteDuration); // release

      osc.connect(gain);
      gain.connect(this.bgmMasterGain!);

      osc.start(startTime);
      osc.stop(startTime + noteDuration + 0.01);

      this.bgmNodes.push(osc);

      // 清理已完成的振荡器引用
      osc.onended = () => {
        const idx = this.bgmNodes.indexOf(osc);
        if (idx >= 0) this.bgmNodes.splice(idx, 1);
      };
    });

    // 在循环结束前 0.5s 调度下一个循环
    this.bgmTimeoutId = setTimeout(() => {
      this.scheduleBGMCycle();
    }, (cycleDuration - 0.5) * 1000);
  }

  // ─── 内部方法 ─────────────────────────────────────

  private canPlay(): boolean {
    if (!this._enabled || !this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx.state === 'running';
  }

  /**
   * 播放单个简单音调
   * @param freq - 频率 Hz
   * @param duration - 持续时间 秒
   * @param type - 波形类型
   * @param volume - 音量 0-1
   * @param delay - 延迟 秒
   */
  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(volume, now);
    // 快速淡出避免爆音
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }
}
