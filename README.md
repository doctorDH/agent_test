# Vita Mahjong

基于 Canvas 的麻将消除游戏，采用**多 Agent 协作架构**开发。

## 游戏截图

20 关麻将消除，从新手到传说，层层递进。

## 技术栈

| 技术 | 用途 |
|------|------|
| TypeScript | 类型安全的游戏逻辑 |
| HTML5 Canvas | 2D 渲染引擎 |
| Vite | 开发服务器 & 构建工具 |
| Vitest | 单元测试（50+ 用例） |
| Capacitor | Android APK 打包 |

## 项目结构

```
vita-mahjong/
├── agent-prompts/         # 5 个开发侧 Agent 的 Prompt 定义
│   ├── architect.md       #   架构师 - 定义契约与接口
│   ├── game-logic-agent.md#   游戏逻辑 - 核心引擎实现
│   ├── ui-agent.md        #   UI - Canvas 渲染与交互
│   ├── level-design-agent.md# 关卡设计 - 20 关布局
│   └── qa-agent.md        #   QA - 测试与验证
├── src/
│   ├── agents/            # 游戏内 Agent 系统
│   │   ├── AgentOrchestrator.ts  # Agent 编排器
│   │   ├── HintAgent.ts          # 智能提示 Agent
│   │   └── DifficultyAgent.ts    # 难度评估 Agent
│   ├── core/              # 核心框架（EventBus、SceneManager）
│   ├── logic/             # 游戏逻辑引擎
│   │   ├── BoardEngine.ts        # 棋盘管理
│   │   ├── MatchingEngine.ts     # 配对检测
│   │   ├── ScoreEngine.ts        # 计分系统
│   │   └── ShuffleEngine.ts      # 洗牌引擎
│   ├── levels/            # 关卡系统（20 关）
│   │   ├── LevelLayouts.ts       # 关卡布局定义
│   │   └── LevelManager.ts       # 关卡难度参数
│   ├── rendering/         # Canvas 渲染
│   ├── scenes/            # 场景管理
│   │   ├── BeginScene.ts         # 关卡选择
│   │   ├── GameScene.ts          # 游戏主场景
│   │   └── SettingsPanel.ts      # 设置面板
│   ├── types/             # TypeScript 类型定义
│   └── Game.ts            # 游戏入口
├── android/               # Capacitor Android 工程
└── package.json
```

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（热更新）
npm run dev

# 运行测试
npm test

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 构建 Android APK

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK 输出: android/app/build/outputs/apk/debug/app-debug.apk
```

## 多 Agent 架构

本项目采用**两层 Agent 架构**：

### 第一层：开发侧 Agent（5 个）

负责代码的设计、实现和验证，Prompt 定义在 `agent-prompts/` 目录：

| Agent | 职责 | 协作模式 |
|-------|------|---------|
| Architect | 定义接口契约、类型系统 | 共享契约 |
| Game Logic | 实现核心游戏引擎 | 流水线（Architect → Logic → QA） |
| UI | Canvas 渲染、交互处理 | 消费契约 |
| Level Design | 20 关布局与难度曲线 | 并行扇出（与 UI 并行） |
| QA | 测试编写、验证 | 审查循环 |

### 第二层：游戏内 Agent（3 个）

运行时嵌入游戏，实现 `IGameAgent` 接口：

| Agent | 功能 |
|-------|------|
| HintAgent | 玩家空闲 10 秒后自动提供配对提示建议 |
| DifficultyAgent | 跟踪玩家表现，每 30 秒评估难度匹配度 |
| AgentOrchestrator | 编排器，管理所有游戏内 Agent 的生命周期 |

## 开发进度

| Phase | 内容 | 主力 Agent | 协作模式 |
|-------|------|-----------|---------|
| Phase 1 地基 | 类型定义 + 核心引擎 + 占位场景 | Architect | 单 Agent 设计契约 |
| Phase 2 逻辑 | BoardEngine + MatchingEngine + ScoreEngine + ShuffleEngine + 50 个测试 | Game Logic + QA | 流水线 |
| Phase 3 渲染 | Canvas 渲染 + 完整 UI 流程 | UI | 消费契约 |
| Phase 4 打磨 | 20 关 + 难度曲线 + 存档 + 音效 + Android APK | Level Design + UI | 并行扇出 |
| Phase 5 Agent | HintAgent + DifficultyAgent + AgentOrchestrator | Game Logic | 编排器模式 |

## License

MIT
