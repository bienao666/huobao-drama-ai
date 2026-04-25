# 🎬 AI短剧创作平台 (Huobao Drama AI)

AI驱动的短剧创作平台 — 从剧本到成片，一站式短剧制作工作台。

> 基于 [huobao-drama](https://github.com/chatfire-AI/huobao-drama) 参考设计，使用 Next.js 16 + NVIDIA NIM API 构建。

## ✨ 功能特性

### 📝 剧本创作
- **AI剧本改写** — 将小说/故事大纲自动改写为标准剧本格式
- **角色与场景提取** — AI自动识别角色信息（外貌、性格、角色定位）和场景描述
- **智能分镜生成** — 自动拆解为分镜镜头，含景别、运镜、动作、对白、氛围等

### 🎨 视觉生成
- **角色头像生成** — 基于角色描述AI生成人物肖像
- **场景图生成** — 基于场景提示词生成环境背景
- **分镜帧生成** — 为每个镜头生成首帧图片
- **批量生成** — 一键生成所有镜头图片

### 🎬 视频制作
- **图片转视频** — 将静态帧图片转化为动态视频片段
- **AI配音(TTS)** — 为对话镜头自动生成语音
- **完整制作流水线** — 图片→视频→配音→成片

### ⚙️ 系统管理
- **NVIDIA NIM API集成** — 支持 Llama 3.1、Mixtral、Nemotron 等大模型
- **多模型选择** — 根据任务复杂度选择合适的AI模型
- **连接测试** — 一键验证API连通性
- **设置管理** — 灵活配置模型、语音、视频参数

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router) + TypeScript 5 |
| **UI** | Tailwind CSS 4 + shadcn/ui + Lucide Icons |
| **数据库** | Prisma ORM + SQLite |
| **状态管理** | Zustand |
| **动画** | Framer Motion |
| **AI-LLM** | NVIDIA NIM API (Llama 3.1 405B/70B, Mixtral 8x22B, Nemotron 70B) |
| **AI-图像** | NVIDIA Stable Diffusion XL + z-ai-web-dev-sdk (fallback) |
| **AI-视频** | z-ai-web-dev-sdk (video generation) |
| **AI-语音** | z-ai-web-dev-sdk (TTS) |

## 🚀 快速开始

### 环境要求
- Node.js 18+ / Bun
- NVIDIA NIM API Key

### 安装

```bash
# 克隆仓库
git clone https://github.com/dav-niu474/huobao-drama-ai.git
cd huobao-drama-ai

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 NVIDIA_API_KEY

# 初始化数据库
bun run db:push

# 启动开发服务器
bun run dev
```

### 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `DATABASE_URL` | SQLite 数据库路径 | ✅ |
| `NVIDIA_API_KEY` | NVIDIA NIM API 密钥 | ✅ |
| `AI_IMAGE_PROVIDER` | 图像生成提供商 (`nvidia` / `z-ai-sdk`) | ❌ |

## 📱 使用流程

```
1. 新建项目 → 选择题材和视觉风格
2. 创建集数 → 进入集数工作台
3. 粘贴原始内容 → AI改写为剧本
4. AI提取角色与场景 → 生成角色头像和场景图
5. AI生成分镜 → 查看镜头列表
6. 生成图片/视频/配音 → 完成制作
```

## 📁 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── ai/              # AI API 路由
│   │   │   ├── rewrite-script/    # 剧本改写
│   │   │   ├── extract/           # 角色/场景提取
│   │   │   ├── generate-storyboard/ # 分镜生成
│   │   │   ├── generate-image/    # 图片生成
│   │   │   ├── generate-character-image/ # 角色头像
│   │   │   ├── generate-video/    # 视频生成
│   │   │   ├── generate-tts/      # TTS配音
│   │   │   └── test-connection/   # 连接测试
│   │   ├── dramas/          # 剧本管理 API
│   │   ├── episodes/        # 集数管理 API
│   │   ├── storyboards/     # 分镜管理 API
│   │   └── settings/        # 设置 API
│   ├── page.tsx             # 主页面
│   ├── layout.tsx           # 根布局
│   └── globals.css          # 全局样式
├── components/
│   ├── project-list.tsx     # 项目列表
│   ├── project-detail.tsx   # 项目详情
│   ├── episode-workspace.tsx # 集数工作台
│   ├── settings-view.tsx    # 设置页面
│   └── ui/                  # shadcn/ui 组件
├── lib/
│   ├── nvidia.ts            # NVIDIA NIM API 客户端
│   ├── ai-config.ts         # AI 服务配置 + 统一客户端
│   ├── api.ts               # API 客户端
│   ├── store.ts             # Zustand 状态管理
│   ├── db.ts                # Prisma 数据库
│   └── utils.ts             # 工具函数
└── prisma/
    └── schema.prisma        # 数据库模型
```

## 🤖 支持的 NVIDIA 模型

### 对话模型 (LLM)
| 模型 | 说明 | 适用场景 |
|------|------|----------|
| `meta/llama-3.1-405b-instruct` | 最强大 | 复杂推理、长文本 |
| `meta/llama-3.1-70b-instruct` | 均衡 | 通用任务 |
| `mistralai/mixtral-8x22b-instruct-v0.1` | 高效 | 多样化任务 |
| `nvidia/llama-3.1-nemotron-70b-instruct` | 精调 | 指令跟随 |

### 图像模型
| 模型 | 说明 |
|------|------|
| `stabilityai/stable-diffusion-xl` | 高质量图像生成 |

## 📄 License

MIT

## 🙏 致谢

- [huobao-drama](https://github.com/chatfire-AI/huobao-drama) — 参考设计灵感
- [NVIDIA NIM](https://build.nvidia.com/) — AI 模型服务
- [Next.js](https://nextjs.org/) — 全栈框架
- [shadcn/ui](https://ui.shadcn.com/) — UI 组件库
