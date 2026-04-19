# Agent 学习指南：从 Vita Mahjong 项目中学习多 Agent 开发

> 本文档基于 Vita Mahjong（麻将消除游戏）的完整开发过程，系统梳理多 Agent 协作的核心模式、
> 与主流框架的对比，以及如何动手搭建自己的 Agent 系统。

---

## 目录

- [A. 复盘：本项目的 Agent 工作流](#a-复盘本项目的-agent-工作流)
- [B. 提炼：6 个可复用的 Agent 模式](#b-提炼6-个可复用的-agent-模式)
- [C. 对比：主流 Agent 框架](#c-对比主流-agent-框架)
- [D. 动手：搭建游戏内 Agent 系统](#d-动手搭建游戏内-agent-系统)

---

## A. 复盘：本项目的 Agent 工作流

### A.1 项目的两层 Agent 架构

```
┌─────────────────────────────────────────────────────┐
│                  开发侧 Agent（5 个）                 │
│                                                     │
│   Architect    Game Logic    UI    Level Design   QA │
│   (定义契约)    (实现逻辑)  (渲染UI)  (关卡设计) (测试) │
│                                                     │
│   协作模式：共享契约 → 流水线 → 并行扇出 → 审查循环   │
└────────────────────────┬────────────────────────────┘
                         │ 产出代码
                         ▼
┌─────────────────────────────────────────────────────┐
│                  游戏内 Agent（3 个）                  │
│                                                     │
│        HintAgent    DifficultyAgent    (可扩展)      │
│        (智能提示)    (难度评估)                       │
│                                                     │
│   由 AgentOrchestrator 统一编排，实现 IGameAgent 接口 │
└─────────────────────────────────────────────────────┘
```

### A.2 开发侧 Agent 的 Prompt 设计

每个 Agent 的 prompt 文件（`agent-prompts/*.md`）都遵循统一结构：

| 组成部分 | 作用 | 示例（Architect Agent） |
|---------|------|----------------------|
| **角色** | 明确身份定位 | "你是项目的架构师 Agent" |
| **职责范围** | 划定可操作的文件/目录 | 只操作 `src/types/*` |
| **边界约束** | 明确禁止做什么 | 禁止编写业务逻辑/渲染代码 |
| **输出格式** | 统一产出规范 | TypeScript 严格模式，I 前缀接口 |
| **协作关系** | 定义与其他 Agent 的交互 | "你的类型定义是所有 Agent 的共享契约" |
| **可用工具** | 授权哪些工具 | Read/Write/Edit/Grep |

**关键设计原则**：

1. **最小权限** — 每个 Agent 只能操作自己负责的文件
2. **显式边界** — 用"禁止"列表防止越界
3. **单一职责** — 一个 Agent 只做一类事
4. **契约驱动** — 通过共享接口而非直接调用来协作

### A.3 逐阶段分析

#### Phase 1：地基（Architect Agent 主导）

```
输入: 游戏需求文档（麻将消除游戏规则）
处理: Architect Agent 设计类型系统
输出: src/types/*.ts（7 个类型文件）

协作模式: 单 Agent + 共享契约
通信方式: 无（此阶段只有一个 Agent 工作）
```

**核心产出**:
- `tile.ts` — 牌的类型定义（TileSuit, TileType, Tile, TilePosition）
- `board.ts` — 棋盘状态（BoardState, BoardConfig）
- `events.ts` — 事件系统（GameEvent discriminated union）
- `scene.ts` — 场景接口（IScene, SceneType）
- `agents.ts` — Agent 接口（IGameAgent, AgentContext）— **预留 Phase 5**

**学习要点**: 接口先行，实现后做。`agents.ts` 在 Phase 1 就被定义，但直到 Phase 5 才实现。这就是"共享契约"的力量 — 所有人在同一张蓝图上工作。

#### Phase 2：逻辑（Game Logic + QA 流水线）

```
输入: Phase 1 的类型定义
处理: Game Logic Agent 实现逻辑 → QA Agent 编写测试 → 发现 bug → 修复
输出: src/logic/*.ts + tests/unit/*.ts（50 个测试用例）

协作模式: 流水线（Pipeline）
通信方式: Architect 产出 → Logic 消费 → QA 验证 → 反馈循环
```

**流水线详细流程**:
```
Architect 产出 BoardState 接口
       ↓
Game Logic 实现 BoardEngine.createBoard()
       ↓
QA 编写测试: "创建棋盘：牌数与布局一致"
       ↓
测试失败 → bug 报告 → Game Logic 修复 → 重新测试
       ↓
全部通过 → Phase 2 完成
```

**Game Logic Agent 的核心约束**:
```
禁止导入任何 DOM/Canvas/浏览器 API
禁止导入 src/rendering/* 或 src/scenes/*
所有函数必须是纯函数：相同输入 → 相同输出，无副作用
```

**学习要点**: "纯函数"约束让逻辑 Agent 的产出可测试、可复用。QA Agent 不能修改源码，只能写测试和报告 bug — 这种"只读审查"模式防止了 Agent 越界。

#### Phase 3：渲染（UI Agent 消费契约）

```
输入: Phase 1 的接口 + Phase 2 的逻辑函数
处理: UI Agent 实现场景和渲染
输出: src/scenes/*.ts + src/rendering/*.ts

协作模式: 消费者模式（Consumer）
通信方式: 通过 IScene 接口 + EventBus 通信
```

**关键通信架构**:
```typescript
// Game.ts 中的事件驱动通信
this.eventBus.on('scene_change', (event) => {
  this.sceneManager.changeScene(event.to, event.data);
});

this.eventBus.on('pointer_down', (event) => {
  this.sceneManager.onPointerDown(event.x, event.y);
});
```

UI Agent 的约束特别重要：
- **只读取**游戏状态（BoardState, GameSession），**不写入**
- 通过 EventBus **发出事件**，由逻辑层处理
- 这实现了"命令查询分离"（CQRS）

#### Phase 4：打磨（Level Design + UI 并行扇出）

```
输入: Phase 1-3 的完整系统
处理: Level Design 设计 20 关布局 + UI 完善设置面板（并行）
输出: src/levels/*.ts + SettingsPanel 功能完善

协作模式: 并行扇出（Fan-out）
通信方式: 独立工作，通过共享接口确保兼容
```

**并行扇出可行的前提条件**:
1. Level Design 和 UI 操作不同的文件 — 无冲突
2. 两者共享 `BoardConfig` 接口 — 数据格式一致
3. `validateLayout()` 作为自动验证门控 — 保证质量

**学习要点**: 并行扇出能大幅提速，但前提是"接口稳定"。如果 Phase 1 的 `BoardConfig` 接口在 Phase 4 还在变化，并行就会产生冲突。

#### Phase 5：Agent（游戏内 Agent 系统）— 待实现

```
输入: Phase 1 预留的 IGameAgent 接口 + Phase 2 的 MatchingEngine
处理: 实现 HintAgent, DifficultyAgent, AgentOrchestrator
输出: src/agents/*.ts + GameScene 集成

协作模式: 编排器模式（Orchestrator）
通信方式: AgentContext.emitEvent() + query() 请求/响应
```

### A.4 工作流总结图

```
Phase 1                Phase 2               Phase 3              Phase 4              Phase 5
┌──────────┐     ┌──────────────────┐    ┌──────────┐    ┌────────────────┐    ┌───────────┐
│ Architect │────▶│ Game Logic ──▶ QA│───▶│ UI Agent │───▶│Level + UI(并行)│───▶│Agent 系统 │
│           │     │ (流水线+反馈)    │    │(消费契约) │    │  (扇出+验证)   │    │ (编排器)   │
└──────────┘     └──────────────────┘    └──────────┘    └────────────────┘    └───────────┘
    │                    │                    │                  │                    │
    ▼                    ▼                    ▼                  ▼                    ▼
types/*.ts          logic/*.ts          scenes/*.ts        levels/*.ts         agents/*.ts
                    tests/*.ts          rendering/*.ts     SettingsPanel       Orchestrator
```

---

## B. 提炼：6 个可复用的 Agent 模式

### 模式 1：共享契约（Shared Contract）

**问题**: 多个 Agent 需要协作，但如果直接互相调用会产生紧耦合。

**解决**: 由一个"架构师"角色先定义共享接口，所有 Agent 面向接口编程。

**本项目实例**:
```typescript
// src/types/scene.ts — Architect Agent 定义的契约
export interface IScene {
  enter(data?: unknown): void;    // 进入场景
  exit(): void;                    // 离开场景
  update(dt: number): void;        // 每帧更新
  render(ctx: CanvasRenderingContext2D): void;  // 每帧渲染
  onPointerDown(x: number, y: number): void;   // 输入处理
  onPointerUp(x: number, y: number): void;
}

// BeginScene, GameScene, CompleteScene 都实现这个接口
// SceneManager 只依赖 IScene，不关心具体实现
```

**通用骨架**:
```typescript
// 1. 定义 Agent 通用接口
interface IAgent {
  name: string;
  initialize(context: Context): void;
  execute(input: Input): Output;
  dispose(): void;
}

// 2. 编排器只依赖接口
class Orchestrator {
  private agents = new Map<string, IAgent>();

  register(agent: IAgent) { this.agents.set(agent.name, agent); }
  run(name: string, input: Input): Output {
    return this.agents.get(name)!.execute(input);
  }
}

// 3. 具体 Agent 各自实现
class AgentA implements IAgent { /* ... */ }
class AgentB implements IAgent { /* ... */ }
```

**使用时机**: 任何多 Agent 系统的第一步。先定契约，再实现。

---

### 模式 2：发布/订阅总线（Pub/Sub Bus）

**问题**: Agent 之间需要通信，但发送者不应关心谁在接收。

**解决**: 中央事件总线，Agent 发布事件，感兴趣的 Agent 订阅。

**本项目实例**:
```typescript
// src/core/EventBus.ts
export class EventBus implements IEventBus {
  private listeners = new Map<GameEventType, Set<Function>>();

  on<T extends GameEventType>(type: T, listener: EventListener<T>): void { /* ... */ }
  emit<T extends GameEventType>(event: EventByType<T>): void {
    const set = this.listeners.get(event.type);
    if (set) set.forEach(fn => fn(event));
  }
}

// 使用：InputManager 发射事件，SceneManager 消费
// InputManager:  eventBus.emit({ type: 'pointer_down', x, y })
// Game.ts:       eventBus.on('pointer_down', (e) => sceneManager.onPointerDown(e.x, e.y))
```

**类型安全的关键**: TypeScript discriminated union
```typescript
// 每种事件有唯一的 type 字面量，编译器自动推导 payload 类型
type GameEvent =
  | { type: 'tile_selected'; tileId: number }
  | { type: 'match_made'; tile1Id: number; tile2Id: number; score: number }
  | { type: 'scene_change'; from: SceneType; to: SceneType; data?: unknown };

// 订阅 'match_made' 时，TypeScript 自动知道有 tile1Id, tile2Id, score
eventBus.on('match_made', (event) => {
  console.log(event.score); // ✅ 类型安全
});
```

**使用时机**: Agent 间需要松耦合的异步通信；事件有明确的类型体系。

---

### 模式 3：编排器（Orchestrator）

**问题**: 多个 Agent 需要统一管理生命周期（创建、运行、销毁）。

**解决**: 中央编排器负责注册、初始化、调度、销毁。Agent 自己不互相调用。

**本项目实例**:
```typescript
// Game.ts — 整个游戏的编排器
export class Game {
  constructor() {
    // 1. 创建基础设施
    this.eventBus = new EventBus();
    this.sceneManager = new SceneManager();

    // 2. 注册所有 "Agent"（场景）
    this.sceneManager.registerScene(SceneType.Begin, new BeginScene(/*...*/));
    this.sceneManager.registerScene(SceneType.Game, new GameScene(/*...*/));
    this.sceneManager.registerScene(SceneType.Complete, new CompleteScene(/*...*/));

    // 3. 连接通信管道
    this.eventBus.on('scene_change', (e) => this.sceneManager.changeScene(e.to, e.data));
    this.eventBus.on('pointer_down', (e) => this.sceneManager.onPointerDown(e.x, e.y));
  }

  start() {
    this.sceneManager.changeScene(SceneType.Begin);  // 4. 启动
    this.gameLoop.start();
  }
}
```

**SceneManager 的生命周期管理**:
```
registerScene() → changeScene() → scene.enter() → scene.update()/render() → scene.exit()
                                                                                    ↓
                                                                           changeScene() → next.enter()
```

**使用时机**: 需要管理多个 Agent 的启停和执行顺序。

---

### 模式 4：流水线（Pipeline）

**问题**: 任务有天然的上下游关系 — A 的输出是 B 的输入。

**解决**: 将 Agent 串成链条，每一步处理后传递给下一步。

**本项目实例**:
```
Architect Agent          Game Logic Agent         QA Agent
     │                        │                       │
     │ 定义 BoardConfig        │                       │
     ├───────────────────────▶│                       │
     │                        │ 实现 createBoard()     │
     │                        ├──────────────────────▶│
     │                        │                       │ 编写测试
     │                        │                       │ 发现 bug
     │                        │◀──────────────────────┤
     │                        │ 修复 bug               │
     │                        ├──────────────────────▶│
     │                        │                       │ 全部通过 ✓
```

**通用骨架**:
```typescript
// 流水线执行器
async function pipeline<T>(input: T, agents: Agent[]): Promise<T> {
  let data = input;
  for (const agent of agents) {
    data = await agent.execute(data);
  }
  return data;
}

// 使用
const result = await pipeline(rawRequirement, [
  architectAgent,    // 需求 → 接口定义
  implementAgent,    // 接口 → 实现代码
  reviewAgent,       // 代码 → 审查意见
]);
```

**使用时机**: 有明确的处理阶段；每阶段的输入/输出格式已知。

---

### 模式 5：并行扇出（Fan-out）

**问题**: 多个独立任务可以同时执行，串行会浪费时间。

**解决**: 将任务分发给多个 Agent 并行处理，汇总结果。

**本项目实例**:
```
                     ┌─ Level Design Agent ─── src/levels/*.ts ──┐
需求: "20关+设置" ──┤                                            ├── 合并测试
                     └─ UI Agent ──────────── SettingsPanel.ts ──┘

前提条件:
1. 两个 Agent 操作不同文件（无冲突）
2. 共享 BoardConfig 接口（数据兼容）
3. validateLayout() 作为自动门控（质量保证）
```

**通用骨架**:
```typescript
// 扇出执行器
async function fanOut(tasks: { agent: Agent; input: any }[]): Promise<any[]> {
  return Promise.all(tasks.map(t => t.agent.execute(t.input)));
}

// 使用
const [layouts, ui] = await fanOut([
  { agent: levelDesignAgent, input: '设计 20 关布局' },
  { agent: uiAgent,          input: '完善设置面板' },
]);
```

**使用时机**: 任务间无依赖；每个 Agent 操作的资源不冲突。

---

### 模式 6：回调委托（Callback Delegation）

**问题**: 两个模块需要交互，但不想产生双向依赖。

**解决**: A 提供"插槽"（回调注册方法），B 注入具体行为。

**本项目实例**:
```typescript
// SettingsPanel 提供回调插槽
class SettingsPanel {
  private onRestart: (() => void) | null = null;

  setOnRestart(cb: () => void): void {
    this.onRestart = cb;
  }

  onPointerDown(x, y) {
    // 点击"重新开始"时调用注入的回调
    if (isRestartButton && this.onRestart) {
      this.onRestart();
      this.close();
    }
  }
}

// GameScene 注入具体行为
this.settingsPanel.setOnRestart(() => {
  this.progressManager.clearGameSave();
  this.startFreshLevel(this.session.levelId);
});
```

**依赖方向**: `GameScene → SettingsPanel`（单向），SettingsPanel 不知道 GameScene 的存在。

**使用时机**: 子组件需要触发父级行为；避免循环依赖。

---

## C. 对比：主流 Agent 框架

### C.1 总览对比表

| 维度 | 本项目（手工模式） | LangChain Agent | AutoGen | CrewAI |
|------|------------------|----------------|---------|--------|
| **Agent 定义** | `agent-prompts/*.md` | Tool + LLM Chain | ConversableAgent | Agent(role, goal, backstory) |
| **通信方式** | EventBus / 回调 | Chain 输入输出 | 消息传递（对话） | Task 委派 |
| **编排模式** | Game.ts 硬编码 | AgentExecutor | GroupChat / Sequential | Crew.kickoff() |
| **工具使用** | Read/Write/Edit/Bash | @tool 装饰器 | register_function | tools=[...] |
| **记忆** | ProgressManager | ConversationBufferMemory | chat_history | long_term_memory |
| **类型安全** | TypeScript 全程 | Python typing（可选） | Python typing（可选） | Python typing（可选） |
| **适用场景** | 学习原理，精确控制 | 通用 LLM 应用 | 多角色对话协作 | 流程化团队协作 |

### C.2 LangChain Agent

**核心概念**: Agent = LLM + Tools + Memory。LLM 决定调用哪个 Tool，形成"思考-行动-观察"循环。

**与本项目的类比**:
```
本项目                          LangChain
─────────────────────────────────────────
agent-prompts/architect.md  ≈   Agent system prompt
IScene 接口                 ≈   @tool 装饰器
EventBus.emit()            ≈   chain.invoke() 的输入输出传递
SceneManager               ≈   AgentExecutor
ProgressManager            ≈   ConversationBufferMemory
```

**Hello World 示例**:
```python
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_anthropic import ChatAnthropic
from langchain_core.tools import tool

@tool
def get_free_tiles(board_state: str) -> str:
    """获取当前棋盘的自由牌列表"""
    # 对应本项目的 MatchingEngine.getFreeTiles()
    return "自由牌: [3, 7, 12, 15]"

@tool
def find_pairs(board_state: str) -> str:
    """查找所有可配对的自由牌"""
    # 对应本项目的 MatchingEngine.findAllFreePairs()
    return "可配对: [(3,7), (12,15)]"

llm = ChatAnthropic(model="claude-sonnet-4-20250514")
agent = create_tool_calling_agent(llm, [get_free_tiles, find_pairs], prompt)
executor = AgentExecutor(agent=agent, tools=[get_free_tiles, find_pairs])

# Agent 自主决定调用哪个工具
result = executor.invoke({"input": "帮我找一个好的配对提示"})
```

**优势**: LLM 自主决策调用路径，灵活性强
**劣势**: 不可预测，可能浪费 token，延迟高

### C.3 AutoGen

**核心概念**: 多个 ConversableAgent 通过"对话"协作。每个 Agent 有自己的 system message，通过消息传递完成任务。

**与本项目的类比**:
```
本项目                           AutoGen
──────────────────────────────────────────
architect.md                 ≈   AssistantAgent(system_message="你是架构师...")
game-logic-agent.md          ≈   AssistantAgent(system_message="你是逻辑开发...")
qa-agent.md                  ≈   AssistantAgent(system_message="你是QA...")
Game.ts（手动编排）           ≈   GroupChat + GroupChatManager
EventBus 事件传递             ≈   Agent 间的消息传递
```

**Hello World 示例**:
```python
from autogen import ConversableAgent, GroupChat, GroupChatManager

architect = ConversableAgent(
    name="Architect",
    system_message="你是架构师，只定义接口，不写实现。",
    llm_config={"model": "claude-sonnet-4-20250514"}
)

developer = ConversableAgent(
    name="Developer",
    system_message="你是开发者，按照架构师的接口实现代码。",
    llm_config={"model": "claude-sonnet-4-20250514"}
)

reviewer = ConversableAgent(
    name="QA",
    system_message="你是QA，审查代码质量，报告bug。",
    llm_config={"model": "claude-sonnet-4-20250514"}
)

# 组聊 = 本项目的 "编排器"
group_chat = GroupChat(agents=[architect, developer, reviewer], messages=[])
manager = GroupChatManager(groupchat=group_chat)

architect.initiate_chat(manager, message="请设计麻将消除游戏的棋盘接口")
```

**优势**: Agent 间自然语言对话，适合头脑风暴和代码审查
**劣势**: 对话轮次不可控，容易跑题

### C.4 CrewAI

**核心概念**: Agent + Task + Crew。每个 Agent 有角色和目标，Task 定义具体工作，Crew 编排执行。

**与本项目的类比**:
```
本项目                          CrewAI
────────────────────────────────────────
architect.md 的角色定义      ≈   Agent(role, goal, backstory)
"定义 BoardConfig 接口"      ≈   Task(description, expected_output)
Phase 1-5 的开发流程         ≈   Crew(agents, tasks, process=sequential)
Phase 4 的并行扇出           ≈   Crew(process=hierarchical)
```

**Hello World 示例**:
```python
from crewai import Agent, Task, Crew, Process

architect = Agent(
    role="架构师",
    goal="定义清晰的 TypeScript 接口",
    backstory="你有10年架构经验，擅长设计可扩展的类型系统",
    tools=[file_read_tool, file_write_tool]
)

developer = Agent(
    role="开发者",
    goal="实现纯函数式的游戏逻辑",
    backstory="你擅长函数式编程，所有代码都是纯函数",
    tools=[file_read_tool, file_write_tool, test_runner_tool]
)

# 定义任务
design_task = Task(
    description="设计麻将消除游戏的棋盘接口（BoardState, Tile, TilePosition）",
    expected_output="TypeScript 接口定义文件",
    agent=architect
)

implement_task = Task(
    description="实现 createBoard() 函数，保证生成的棋盘一定可解",
    expected_output="通过所有测试的 BoardEngine.ts",
    agent=developer,
    context=[design_task]  # 依赖架构师的产出
)

# Crew = 本项目的 Game.ts 编排器
crew = Crew(
    agents=[architect, developer],
    tasks=[design_task, implement_task],
    process=Process.sequential  # 流水线模式
)

result = crew.kickoff()
```

**优势**: 结构化流程，任务依赖清晰，易于理解
**劣势**: 灵活性低于 AutoGen，不适合需要 Agent 间深度讨论的场景

### C.5 如何选择？

```
需要 LLM 自主决策工具调用？        → LangChain Agent
需要多 Agent 自由对话讨论？        → AutoGen
需要结构化的任务流水线？           → CrewAI
需要精确控制和类型安全？           → 手工模式（本项目方式）
需要学习 Agent 底层原理？          → 手工模式（推荐入门）
```

---

## D. 动手：搭建游戏内 Agent 系统

### D.1 架构总览

```
GameScene
    │
    ├── AgentOrchestrator ──── 管理所有 Agent 的生命周期
    │       │
    │       ├── HintAgent ──── 监测空闲时间，提供配对提示
    │       │
    │       └── DifficultyAgent ── 跟踪玩家表现，评估难度
    │
    ├── session: GameSession ──── Agent 可读取的游戏状态
    │
    └── EventBus ──── Agent 通过 emitEvent 发送建议
```

### D.2 已有的接口（Phase 1 预留）

```typescript
// src/types/agents.ts — Architect Agent 在 Phase 1 定义的契约

interface IGameAgent {
  readonly name: string;
  initialize(context: AgentContext): void;  // 注入上下文
  update(state: GameSession, delta: number): void;  // 每帧调用
  query(request: AgentRequest): AgentResponse | Promise<AgentResponse>;  // 请求/响应
  dispose(): void;  // 释放资源
}

interface AgentContext {
  session: GameSession;
  emitEvent: (event: AgentEvent) => void;  // 向宿主发事件
}

interface AgentEvent {
  type: AgentEventType;  // hint_suggestion | difficulty_adjustment | ...
  payload: unknown;
  timestamp: number;
}
```

### D.3 实现三个文件

**HintAgent** (`src/agents/HintAgent.ts`):
- `update()` 中跟踪 `lastMatchTime`，空闲超 10 秒 → `emitEvent(HintSuggestion)`
- `query({ action: 'get_hint' })` → 调用 `findAllFreePairs()` 返回最优配对
- "最优"策略：优先消除高层牌（减少阻塞）

**DifficultyAgent** (`src/agents/DifficultyAgent.ts`):
- `update()` 中累计统计：配对间隔、提示使用次数、连击率
- `query({ action: 'assess' })` → 返回 `{ difficulty: 'too_easy' | 'balanced' | 'too_hard' }`
- 评估算法：综合配对速度、错误率、道具使用率

**AgentOrchestrator** (`src/agents/AgentOrchestrator.ts`):
- 注册、初始化、逐帧更新、按名查询、统一销毁

### D.4 集成到 GameScene

```typescript
// GameScene.startFreshLevel() 中
this.orchestrator = new AgentOrchestrator();
this.orchestrator.registerAgent(new HintAgent());
this.orchestrator.registerAgent(new DifficultyAgent());
this.orchestrator.initializeAll({
  session: this.session,
  emitEvent: (event) => this.handleAgentEvent(event),
});

// GameScene.update() 中
this.orchestrator.updateAll(this.session, dt);

// GameScene 关卡结束时
this.orchestrator.disposeAll();
```

### D.5 学习要点

这个 Agent 系统体现了前面提炼的**所有 6 个模式**：

| 模式 | 在 Agent 系统中的体现 |
|------|---------------------|
| 共享契约 | `IGameAgent` 接口 |
| 发布/订阅 | `emitEvent()` → `handleAgentEvent()` |
| 编排器 | `AgentOrchestrator` |
| 流水线 | HintAgent 读取 → 分析 → 发送建议 |
| 并行扇出 | HintAgent 和 DifficultyAgent 独立并行 update |
| 回调委托 | `AgentContext.emitEvent` 是 GameScene 注入的回调 |

---

## 附录：从本项目出发的进阶方向

1. **LLM 驱动的 Agent**: 将 HintAgent 的决策逻辑替换为 LLM 调用（如 Claude API），体验 AI Agent 的灵活性与不确定性
2. **Agent 间对话**: 让 HintAgent 和 DifficultyAgent 通过消息传递协商（如 AutoGen 模式），而不是独立运行
3. **动态编排**: AgentOrchestrator 根据游戏状态动态启停 Agent（如新手模式多提示，高手模式关闭提示）
4. **可观测性**: 为 Agent 添加日志和指标，监控每个 Agent 的执行耗时和事件频率
