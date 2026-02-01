# v0.2 图片功能设计

## 概述

增强图片功能，让用户可以：
- **输入**：用图片作为 Conversation Starter 或中途补充
- **输出**：生成笔记卡片图片，或直接使用原图

## Part 1: 输入端 - 图片进入对话

### 功能
- 主页粘贴截图 → 开始 Co-think → AI 看到图片并基于内容采访
- 对话中途粘贴图片 → AI 看到并继续讨论

### 技术方案
- **Claude Vision API**：使用 image content block 传递图片
- **图片压缩**：前端 Canvas API 压缩
  - 最大宽度：1024px
  - 质量：80% (JPEG)
  - 格式：统一转 JPEG（PNG 透明图除外）
- **存储**：MVP 阶段继续用 base64，不上传云存储

### 改动文件
- `src/app/api/chat/route.ts` - 支持图片消息
- `src/components/CaptureInput.tsx` - 图片压缩 + 传入对话
- `src/components/ChatInterface.tsx` - 中途添加图片
- `src/lib/image-utils.ts` - 新建，图片压缩工具函数

## Part 2: 输出端 - 文字 + 图片并行

### 功能
Transform 页面提供两种输出：
- **文字版**：Twitter 格式（原有功能）
- **图片版**：
  - 笔记卡片：AI 提炼标题 + 要点，生成图片
  - 原图直出：用户的截图直接下载

### UI 设计
- Tab 切换：文字版 / 图片版
- **复古打字机风格**：
  - 米色背景 (#f4f1ea)
  - IBM Plex Mono + Special Elite 字体
  - 纸张质感 + 阴影效果

### 笔记卡片模板
```
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │
│  │  > 标题_                  │  │
│  │                           │  │
│  │  > 要点一                 │  │
│  │  > 要点二                 │  │
│  │  > 要点三                 │  │
│  │                           │  │
│  │  @username    2025.01.31  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 技术方案
- **图片生成**：HTML 模板 + html2canvas
- **AI 提炼**：新增 `/api/extract-points` 从对话提取标题和要点

### 改动文件
- `src/components/TransformResult.tsx` - 重构，支持 Tab 切换
- `src/components/NoteCardTemplate.tsx` - 新建，笔记卡片组件
- `src/app/api/extract-points/route.ts` - 新建，提取要点 API
- `src/lib/generate-image.ts` - 新建，html2canvas 封装

## 实现计划

### Phase 1: 输入端图片支持
1. 创建 `image-utils.ts` 图片压缩工具
2. 修改 `CaptureInput.tsx` 压缩图片
3. 修改 `/api/chat/route.ts` 支持 vision
4. 修改 `ChatInterface.tsx` 支持中途添加图片

### Phase 2: 输出端图片生成
1. 安装 html2canvas 依赖
2. 创建 `NoteCardTemplate.tsx` 笔记卡片组件
3. 创建 `/api/extract-points` 提取要点
4. 创建 `generate-image.ts` 图片生成工具
5. 重构 `TransformResult.tsx` 支持 Tab 切换

## 验证方式

1. **输入端**：粘贴一张截图 → AI 能描述图片内容并提问
2. **输出端**：对话完成后 → 能生成笔记卡片图片并下载
3. **原图直出**：能直接下载/复制原始截图
