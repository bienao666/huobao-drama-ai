# 🎬 AI短剧创作平台 (Huobao Drama AI)

AI驱动的短剧创作平台 — 从剧本到成片，一站式短剧制作工作台。

> 基于 [huobao-drama](https://github.com/chatfire-AI/huobao-drama) 参考设计，使用 Next.js 16 + 多AI供应商架构 构建。

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
- **本地上传** — 支持本地上传图片/视频/音频文件

### 🎬 视频制作
- **图片转视频** — 将静态帧图片转化为动态视频片段
- **AI配音(TTS)** — 为对话镜头自动生成语音
- **完整制作流水线** — 图片→视频→配音→成片

### 📋 提示词管理
- **提示词输出** — 每个镜头自动生成图片/视频提示词
- **一键复制** — 复制提示词到剪贴板，方便在其他平台使用
- **无Key也可用** — 即使没有API Key，也能复制提示词去其他平台生成后本地上传

### ⚙️ 多供应商配置
- **LLM语言模型** — NVIDIA NIM / OpenAI / SiliconFlow / DeepSeek / 自定义兼容接口
- **图片生成** — NVIDIA SDXL / OpenAI DALL·E / SiliconFlow / Stability AI / z-ai-sdk / 自定义接口
- **视频生成** — z-ai-sdk / SiliconFlow / 火山引擎(Kling) / 自定义接口
- **语音合成** — z-ai-sdk / OpenAI TTS / Fish Audio / 火山引擎 / 自定义接口
- **可视化配置** — 每个供应商独立配置 API Key、Base URL、模型名称
- **一键切换** — 选择活跃供应商，立即生效
- **连接测试** — 一键验证API连通性
- **数据库存储** — 设置保存在数据库，Vercel部署兼容

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router) + TypeScript 5 |
| **UI** | Tailwind CSS 4 + shadcn/ui + Lucide Icons |
| **数据库** | Prisma ORM + SQLite (开发) / PostgreSQL (生产) |
| **状态管理** | Zustand |
| **动画** | Framer Motion |
| **AI-LLM** | 多供应商：NVIDIA NIM / OpenAI / DeepSeek / SiliconFlow |
| **AI-图像** | 多供应商：NVIDIA SDXL / DALL·E / Stability AI / SiliconFlow / z-ai-sdk |
| **AI-视频** | 多供应商：z-ai-sdk / SiliconFlow / 火山引擎 |
| **AI-语音** | 多供应商：z-ai-sdk / OpenAI TTS / Fish Audio / 火山引擎 |

## 🚀 快速开始

### 环境要求
- Node.js 18+ / Bun
- 至少一个 AI 供应商的 API Key（推荐 NVIDIA 或 OpenAI）

### 安装

```bash
# 克隆仓库
git clone https://github.com/dav-niu474/huobao-drama-ai.git
cd huobao-drama-ai

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key

# 初始化数据库
bun run db:push

# 启动开发服务器
bun run dev
```

### Vercel 部署

1. Fork 本仓库到你的 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量（至少填入一个 AI 供应商的 API Key）
4. 部署完成后，在平台设置页面配置更多供应商

### 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `DATABASE_URL` | 数据库连接字符串 | ✅ |
| `NVIDIA_API_KEY` | NVIDIA NIM API 密钥 | ❌ |
| `OPENAI_API_KEY` | OpenAI API 密钥 | ❌ |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | ❌ |
| `SILICONFLOW_API_KEY` | SiliconFlow API 密钥 | ❌ |
| `STABILITY_API_KEY` | Stability AI API 密钥 | ❌ |
| `VOLCENGINE_API_KEY` | 火山引擎 API 密钥 | ❌ |
| `FISH_AUDIO_API_KEY` | Fish Audio API 密钥 | ❌ |

> 💡 只需配置至少一个供应商即可使用，也可在平台设置页面中配置（保存到数据库）

## 📱 使用流程

```
1. 新建项目 → 选择题材和视觉风格
2. 创建集数 → 进入集数工作台
3. 粘贴原始内容 → AI改写为剧本
4. AI提取角色与场景 → 生成角色头像和场景图
5. AI生成分镜 → 查看镜头列表及提示词
6. 生成图片/视频/配音 → 完成制作
   ↳ 或复制提示词到其他平台生成，然后本地上传
```

### 无API Key使用方式

即使没有配置AI供应商的API Key，你也可以：

1. **复制提示词** — 每个分镜都会生成图片/视频提示词，点击复制按钮即可复制
2. **其他平台生成** — 将复制的提示词粘贴到 Midjourney、Runway、Kling 等平台生成内容
3. **本地上传** — 将生成的内容通过上传按钮导入到平台中

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
│   │   ├── upload/          # 文件上传 API
│   │   └── settings/        # 设置 API (数据库存储)
│   ├── page.tsx             # 主页面
│   ├── layout.tsx           # 根布局
│   └── globals.css          # 全局样式
├── components/
│   ├── project-list.tsx     # 项目列表
│   ├── project-detail.tsx   # 项目详情
│   ├── episode-workspace.tsx # 集数工作台
│   ├── settings-view.tsx    # 设置页面 (多供应商配置)
│   └── ui/                  # shadcn/ui 组件
├── lib/
│   ├── nvidia.ts            # NVIDIA NIM API 客户端 (底层)
│   ├── ai-config.ts         # 多供应商 AI 配置 + 统一客户端
│   ├── api.ts               # API 客户端
│   ├── store.ts             # Zustand 状态管理
│   ├── db.ts                # Prisma 数据库
│   └── utils.ts             # 工具函数
└── prisma/
    └── schema.prisma        # 数据库模型 (Drama/Episode/Character/Scene/Storyboard/AiProvider)
```

## 🤖 支持的 AI 供应商

### LLM 语言模型
| 供应商 | 模型示例 | 适用场景 |
|--------|----------|----------|
| NVIDIA NIM | Llama 3.1 405B/70B, Mixtral 8x22B, Nemotron 70B | 高质量推理 |
| OpenAI | GPT-4o, GPT-4o-mini | 通用任务 |
| SiliconFlow | DeepSeek-V3, Qwen, Llama | 国内高速访问 |
| DeepSeek | DeepSeek Chat | 性价比高 |
| 自定义 | 任何 OpenAI 兼容接口 | 中转站/私有部署 |

### 图片生成
| 供应商 | 模型示例 | 说明 |
|--------|----------|------|
| NVIDIA SDXL | Stable Diffusion XL | 高质量生成 |
| OpenAI DALL·E | DALL·E 3 | 创意图片 |
| SiliconFlow | SDXL, FLUX | 国内高速访问 |
| Stability AI | SDXL | 官方API |
| z-ai-sdk | DALL·E 3 | 内置，无需额外配置 |

### 视频生成
| 供应商 | 说明 |
|--------|------|
| z-ai-sdk | 内置视频生成 |
| SiliconFlow | 国内视频生成 |
| 火山引擎(Kling) | 高质量视频 |

### 语音合成
| 供应商 | 说明 |
|--------|------|
| z-ai-sdk | 内置TTS |
| OpenAI TTS | 高质量语音 |
| Fish Audio | 专业语音克隆 |
| 火山引擎 | 国内TTS |

## 📄 License

MIT

## 🙏 致谢

- [huobao-drama](https://github.com/chatfire-AI/huobao-drama) — 参考设计灵感
- [NVIDIA NIM](https://build.nvidia.com/) — AI 模型服务
- [Next.js](https://nextjs.org/) — 全栈框架
- [shadcn/ui](https://ui.shadcn.com/) — UI 组件库
