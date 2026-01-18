# Nano Banana 图像生成服务

基于 Google Gemini 2.5 Flash 的图像生成服务，支持异步任务和状态轮询。

**注意**：统一使用 `gemini-2.5-flash` 基础模型，不使用 `-image` 或 `-preview` 后缀变体，因为基础模型的免费额度更高。

## 环境变量配置

在 `.env.local` 文件中添加以下环境变量：

```bash
# Nano Banana API Key (优先使用)
NANO_BANANA_API_KEY=your_api_key_here

# 或者使用通用的 Google Generative AI API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

**注意**: 如果同时设置了两个环境变量，`NANO_BANANA_API_KEY` 会优先使用。

## 功能特性

- ✅ 支持文本到图像生成
- ✅ 支持负向提示词（negative prompt）
- ✅ 支持自定义宽高比（默认 21:9 电影比例）
- ✅ 支持参考图像 ID（用于保持一致性）
- ✅ 异步任务管理
- ✅ 状态轮询机制
- ✅ 自动任务清理

## API 参考

### `generateImage(params)`

创建图像生成任务。

**参数**:
- `prompt` (string, 必需): 图像生成提示词
- `negative_prompt` (string, 可选): 负向提示词，描述不想要的内容
- `aspect_ratio` (string, 可选): 宽高比，默认为 `"21:9"`
  - 支持格式: `"21:9"`, `"16:9"`, `"1:1"`, `"9:16"` 等
- `reference_image_id` (string, 可选): 参考图像 ID，用于保持生成图像的一致性

**返回**:
```typescript
{
  taskId: string
  status: 'pending'
  message?: string
}
```

**示例**:
```typescript
import { generateImage } from '@/src/services/nanoBanana'

const response = await generateImage({
  prompt: 'A futuristic cityscape at night',
  aspect_ratio: '21:9',
  negative_prompt: 'people, cars'
})
```

### `checkStatus(taskId, maxWaitTime?, pollInterval?)`

检查任务状态并轮询直到完成。

**参数**:
- `taskId` (string, 必需): 任务 ID
- `maxWaitTime` (number, 可选): 最大等待时间（毫秒），默认 120000 (2分钟)
- `pollInterval` (number, 可选): 轮询间隔（毫秒），默认 2000 (2秒)

**返回**:
```typescript
{
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  imageUrl?: string  // Base64 数据 URL
  error?: string
  progress?: number  // 0-100
}
```

**示例**:
```typescript
import { checkStatus } from '@/src/services/nanoBanana'

const result = await checkStatus(response.taskId)

if (result.status === 'completed') {
  console.log('图像 URL:', result.imageUrl)
}
```

### `getTask(taskId)`

获取任务当前状态（不轮询）。

**参数**:
- `taskId` (string, 必需): 任务 ID

**返回**: `CheckStatusResponse | null`

**示例**:
```typescript
import { getTask } from '@/src/services/nanoBanana'

const status = getTask(taskId)
if (status) {
  console.log('状态:', status.status)
  console.log('进度:', status.progress)
}
```

### `cleanupTasks(olderThan?)`

清理已完成或失败的任务（用于内存管理）。

**参数**:
- `olderThan` (number, 可选): 清理早于指定时间（毫秒）的任务，默认 3600000 (1小时)

**示例**:
```typescript
import { cleanupTasks } from '@/src/services/nanoBanana'

// 清理 1 小时前的任务
cleanupTasks()
```

## 使用示例

### 基本使用

```typescript
import { generateImage, checkStatus } from '@/src/services/nanoBanana'

// 1. 创建生成任务
const task = await generateImage({
  prompt: 'A serene forest with sunbeams',
  aspect_ratio: '16:9'
})

// 2. 轮询直到完成
const result = await checkStatus(task.taskId)

if (result.status === 'completed') {
  // 使用图像 URL
  const imageUrl = result.imageUrl
  console.log('生成成功:', imageUrl)
}
```

### 在 Next.js API 路由中使用

```typescript
// app/api/generate-image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateImage, checkStatus } from '@/src/services/nanoBanana'

export async function POST(request: NextRequest) {
  try {
    const { prompt, negative_prompt, aspect_ratio, reference_image_id } = await request.json()
    
    const task = await generateImage({
      prompt,
      negative_prompt,
      aspect_ratio: aspect_ratio || '21:9',
      reference_image_id
    })
    
    return NextResponse.json({ taskId: task.taskId, status: task.status })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    
    if (!taskId) {
      return NextResponse.json({ error: '缺少 taskId' }, { status: 400 })
    }
    
    const status = await checkStatus(taskId)
    return NextResponse.json(status)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### 前端使用

```typescript
// 在 React 组件中
async function generateImage() {
  // 创建任务
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'A cyberpunk cityscape',
      aspect_ratio: '21:9'
    })
  })
  
  const { taskId } = await response.json()
  
  // 轮询状态
  const pollStatus = async () => {
    const statusResponse = await fetch(`/api/generate-image?taskId=${taskId}`)
    const status = await statusResponse.json()
    
    if (status.status === 'completed') {
      setImageUrl(status.imageUrl)
    } else if (status.status === 'failed') {
      setError(status.error)
    } else {
      // 继续轮询
      setTimeout(pollStatus, 2000)
    }
  }
  
  pollStatus()
}
```

## 注意事项

1. **内存存储**: 当前实现使用内存存储任务，重启服务后任务会丢失。生产环境建议使用数据库（如 Redis、PostgreSQL）存储任务状态。

2. **图像 URL**: 当前返回的是 Base64 数据 URL。生产环境建议：
   - 将图像上传到云存储（如 AWS S3、Google Cloud Storage）
   - 返回云存储的公开 URL

3. **参考图像**: `reference_image_id` 功能需要额外实现参考图像的加载逻辑。当前版本中此功能为占位实现。

4. **代理设置**: 在开发环境下，如果无法直接访问 Google API，会自动使用 `http://127.0.0.1:10081` 代理。

5. **错误处理**: 请确保在生产环境中实现适当的错误处理和重试机制。

## 支持的宽高比

- `21:9` - 超宽屏电影比例（默认）
- `16:9` - 标准宽屏
- `1:1` - 正方形
- `9:16` - 竖屏（手机）
- 其他自定义比例（格式: "宽度:高度"）

## 任务状态

- `pending` - 任务已创建，等待处理
- `processing` - 正在生成图像
- `completed` - 生成成功，图像可用
- `failed` - 生成失败，查看 `error` 字段获取详情
