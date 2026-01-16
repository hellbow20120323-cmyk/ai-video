/**
 * Nano Banana (Gemini 2.5 Flash Image) 图像生成服务
 * 基于 Google Generative AI SDK
 * 支持异步任务和状态轮询
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { setGlobalDispatcher, ProxyAgent } from 'undici'

// 在开发环境下设置代理
if (process.env.NODE_ENV === 'development') {
  const proxyAgent = new ProxyAgent('http://127.0.0.1:10081')
  setGlobalDispatcher(proxyAgent)
}

/**
 * 任务状态类型
 */
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * 图像生成任务接口
 */
export interface ImageGenerationTask {
  taskId: string
  status: TaskStatus
  prompt: string
  negativePrompt?: string
  aspectRatio: string
  referenceImageId?: string
  imageUrl?: string
  error?: string
  createdAt: number
  completedAt?: number
}

/**
 * 图像生成请求参数
 */
export interface GenerateImageParams {
  prompt: string
  negative_prompt?: string
  aspect_ratio?: string // 格式: "21:9", "16:9", "1:1", "9:16" 等
  reference_image_id?: string
}

/**
 * 图像生成响应
 */
export interface GenerateImageResponse {
  taskId: string
  status: TaskStatus
  message?: string
}

/**
 * 任务状态检查响应
 */
export interface CheckStatusResponse {
  taskId: string
  status: TaskStatus
  imageUrl?: string
  error?: string
  progress?: number // 0-100
}

// 内存任务存储（生产环境应使用数据库）
const taskStore = new Map<string, ImageGenerationTask>()

// 初始化 Google Generative AI 客户端
let genAI: GoogleGenerativeAI | null = null

/**
 * 获取或初始化 Google Generative AI 客户端
 */
function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.NANO_BANANA_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    
    if (!apiKey) {
      throw new Error('NANO_BANANA_API_KEY 或 GOOGLE_GENERATIVE_AI_API_KEY 环境变量未设置')
    }
    
    genAI = new GoogleGenerativeAI(apiKey)
  }
  
  return genAI
}

/**
 * 将宽高比转换为像素尺寸
 * @param aspectRatio - 宽高比字符串，如 "21:9", "16:9"
 * @returns 像素尺寸对象 { width, height }
 */
function parseAspectRatio(aspectRatio: string): { width: number; height: number } {
  const [width, height] = aspectRatio.split(':').map(Number)
  
  if (!width || !height) {
    throw new Error(`无效的宽高比格式: ${aspectRatio}`)
  }
  
  // 根据宽高比计算合适的像素尺寸
  // 21:9 电影比例 -> 2048x878 (接近 2K)
  // 16:9 -> 2048x1152
  // 1:1 -> 1024x1024
  // 9:16 -> 1152x2048
  
  const baseHeight = 1024
  const calculatedWidth = Math.round((width / height) * baseHeight)
  
  // 确保宽度是 8 的倍数（某些模型要求）
  const alignedWidth = Math.round(calculatedWidth / 8) * 8
  const alignedHeight = Math.round(baseHeight / 8) * 8
  
  return {
    width: alignedWidth,
    height: alignedHeight
  }
}

/**
 * 生成唯一任务 ID
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 执行实际的图像生成
 * 包含 429 频率限制错误的重试逻辑
 */
async function executeImageGeneration(task: ImageGenerationTask, retryCount: number = 0): Promise<void> {
  const MAX_RETRIES = 1 // 最大重试次数为 1 次
  
  try {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel(
      { model: 'gemini-2.5-flash-image' },
      { apiVersion: 'v1beta' }
    )
    
    // 构建生成配置（符合 2026 年 Gemini 2.5 规范）
    // 注意：SDK 使用驼峰命名，但 API 实际需要下划线命名，SDK 会自动转换
    const dimensions = parseAspectRatio(task.aspectRatio)
    
    const generationConfig: any = {
      imageConfig: {
        aspectRatio: task.aspectRatio,
        imageSize: `${dimensions.width}x${dimensions.height}`
      },
      responseModalities: ['IMAGE']
    }
    
    // 构建提示词
    let promptText = task.prompt
    
    if (task.negativePrompt) {
      promptText += `\n\nNegative prompt: ${task.negativePrompt}`
    }
    
    // 构建 parts 数组（符合 2026 年 Gemini 2.5 规范）
    const parts: any[] = []
    
    // 如果有参考图像 ID（Base64 数据 URL），将其作为输入图像
    if (task.referenceImageId) {
      try {
        // 处理 Base64 数据 URL 格式：data:image/png;base64,...
        let imageData: string = task.referenceImageId
        let mimeType: string = 'image/png'
        
        // 如果是数据 URL，提取 MIME 类型和 Base64 数据
        if (imageData.startsWith('data:')) {
          const dataUrlMatch = imageData.match(/^data:([^;]+);base64,(.+)$/)
          if (dataUrlMatch) {
            mimeType = dataUrlMatch[1] || 'image/png'
            imageData = dataUrlMatch[2]
          } else {
            // 如果不是标准格式，尝试直接使用
            const base64Match = imageData.match(/base64,(.+)$/)
            if (base64Match) {
              imageData = base64Match[1]
            }
          }
        }
        
        // 将参考图像添加到 parts 数组（作为第一个元素，Gemini 会将其作为参考）
        // 注意：使用 inline_data（下划线）而不是 inlineData（驼峰），符合 API 规范
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: imageData
          }
        })
        
        // 在提示词中说明这是参考图像，用于保持角色一致性
        promptText = `Using the provided reference image to maintain character consistency. ${promptText}`
        
        console.log('使用参考图像确保角色一致性，图像大小:', imageData.length, 'bytes')
      } catch (error) {
        console.error('处理参考图像失败:', error)
        // 如果处理失败，继续使用纯文本提示词
      }
    }
    
    // 添加文本提示词到 parts 数组
    parts.push({ text: promptText })
    
    // 调用生成 API（符合 2026 年 Gemini 2.5 规范：必须包含 role 和 parts）
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: parts
        }
      ],
      generationConfig
    })
    
    // 提取图像数据
    const response = result.response
    const imageParts = response.candidates?.[0]?.content?.parts?.filter(
      (part: any) => part.inline_data
    )
    
    if (!imageParts || imageParts.length === 0) {
      throw new Error('API 响应中未找到图像数据')
    }
    
    // 将 Base64 图像数据转换为 URL
    // 这里我们返回 Base64 数据 URL，实际项目中可以上传到云存储并返回 URL
    const imageData = imageParts[0]?.inline_data
    if (!imageData || !imageData.mime_type || !imageData.data) {
      throw new Error('API 响应中的图像数据格式无效')
    }
    const imageUrl = `data:${imageData.mime_type};base64,${imageData.data}`
    
    // 更新任务状态
    task.status = 'completed'
    task.imageUrl = imageUrl
    task.completedAt = Date.now()
    
  } catch (error: any) {
    // 检查是否为 429 频率限制错误
    const isRateLimitError = 
      error?.status === 429 ||
      error?.code === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('rate limit') ||
      error?.message?.includes('RATE_LIMIT') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('QUOTA_EXCEEDED')
    
    // 如果是 429 错误且未超过最大重试次数，则重试
    if (isRateLimitError && retryCount < MAX_RETRIES) {
      // 尝试从错误中提取 retryDelay
      let retryDelay = 5000 // 默认等待 5 秒
      
      // 检查 errorDetails 中的 retryDelay
      if (error?.errorDetails?.[0]?.retryDelay) {
        retryDelay = error.errorDetails[0].retryDelay
      } else if (error?.retryDelay) {
        retryDelay = error.retryDelay
      } else if (error?.details?.[0]?.retryDelay) {
        retryDelay = error.details[0].retryDelay
      } else if (error?.response?.headers?.['retry-after']) {
        // 从 HTTP 响应头中获取 Retry-After（秒转换为毫秒）
        retryDelay = parseInt(error.response.headers['retry-after'], 10) * 1000
      } else if (error?.response?.headers?.['Retry-After']) {
        retryDelay = parseInt(error.response.headers['Retry-After'], 10) * 1000
      }
      
      // 确保 retryDelay 是有效数字，且不超过 60 秒
      retryDelay = Math.min(Math.max(Number(retryDelay) || 5000, 1000), 60000)
      
      console.log(`遇到 429 频率限制错误，将在 ${retryDelay}ms 后重试 (${retryCount + 1}/${MAX_RETRIES})`)
      
      // 更新任务状态为处理中
      task.status = 'processing'
      
      // 等待 retryDelay 后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      
      // 递归重试
      return executeImageGeneration(task, retryCount + 1)
    }
    
    // 如果不是 429 错误，或已达到最大重试次数，则标记为失败
    task.status = 'failed'
    task.error = error.message || '图像生成失败'
    task.completedAt = Date.now()
    
    // 如果是 429 错误但已达到最大重试次数，提供更明确的错误信息
    if (isRateLimitError) {
      task.error = 'API 频率限制：已达到最大重试次数，请稍后重试'
    }
    
    throw error
  }
}

/**
 * 生成图像
 * 创建异步任务并立即返回任务 ID
 * 
 * @param params - 图像生成参数
 * @returns 任务 ID 和初始状态
 */
export async function generateImage(
  params: GenerateImageParams
): Promise<GenerateImageResponse> {
  const {
    prompt,
    negative_prompt,
    aspect_ratio = '21:9', // 默认电影比例
    reference_image_id
  } = params
  
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('prompt 参数不能为空')
  }
  
  // 创建任务
  const taskId = generateTaskId()
  const task: ImageGenerationTask = {
    taskId,
    status: 'pending',
    prompt: prompt.trim(),
    negativePrompt: negative_prompt,
    aspectRatio: aspect_ratio,
    referenceImageId: reference_image_id,
    createdAt: Date.now()
  }
  
  // 存储任务
  taskStore.set(taskId, task)
  
  // 异步执行图像生成（不阻塞）
  executeImageGeneration(task).catch((error) => {
    console.error(`任务 ${taskId} 执行失败:`, error)
    // 错误已在 executeImageGeneration 中处理
  })
  
  return {
    taskId,
    status: 'pending',
    message: '图像生成任务已创建，请使用 checkStatus 轮询状态'
  }
}

/**
 * 检查任务状态
 * 支持轮询直到任务完成
 * 
 * @param taskId - 任务 ID
 * @param maxWaitTime - 最大等待时间（毫秒），默认 120000 (2分钟)
 * @param pollInterval - 轮询间隔（毫秒），默认 2000 (2秒)
 * @returns 任务状态和结果
 */
export async function checkStatus(
  taskId: string,
  maxWaitTime: number = 120000,
  pollInterval: number = 2000
): Promise<CheckStatusResponse> {
  const task = taskStore.get(taskId)
  
  if (!task) {
    throw new Error(`任务 ${taskId} 不存在`)
  }
  
  const startTime = Date.now()
  
  // 如果任务已完成或失败，直接返回
  if (task.status === 'completed' || task.status === 'failed') {
    return {
      taskId,
      status: task.status,
      imageUrl: task.imageUrl,
      error: task.error,
      progress: task.status === 'completed' ? 100 : 0
    }
  }
  
  // 如果任务还在处理中，等待并轮询
  while (task.status === 'pending' || task.status === 'processing') {
    // 检查是否超时
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error(`任务 ${taskId} 超时（超过 ${maxWaitTime}ms）`)
    }
    
    // 更新任务状态为处理中
    if (task.status === 'pending') {
      task.status = 'processing'
    }
    
    // 等待指定间隔
    await new Promise(resolve => setTimeout(resolve, pollInterval))
    
    // 重新获取任务状态
    const updatedTask = taskStore.get(taskId)
    if (!updatedTask) {
      throw new Error(`任务 ${taskId} 在执行过程中被删除`)
    }
    
    // 如果任务已完成或失败，返回结果
    if (updatedTask.status === 'completed' || updatedTask.status === 'failed') {
      return {
        taskId,
        status: updatedTask.status,
        imageUrl: updatedTask.imageUrl,
        error: updatedTask.error,
        progress: updatedTask.status === 'completed' ? 100 : 0
      }
    }
    
    // 计算进度（简单估算：基于等待时间）
    const elapsed = Date.now() - startTime
    const estimatedProgress = Math.min(90, Math.floor((elapsed / maxWaitTime) * 90))
    
    // 返回当前状态
    return {
      taskId,
      status: updatedTask.status,
      progress: estimatedProgress
    }
  }
  
  // 最终返回
  return {
    taskId,
    status: task.status,
    imageUrl: task.imageUrl,
    error: task.error,
    progress: task.status === 'completed' ? 100 : 0
  }
}

/**
 * 获取任务信息（不轮询）
 * 
 * @param taskId - 任务 ID
 * @returns 任务当前状态
 */
export function getTask(taskId: string): CheckStatusResponse | null {
  const task = taskStore.get(taskId)
  
  if (!task) {
    return null
  }
  
  return {
    taskId,
    status: task.status,
    imageUrl: task.imageUrl,
    error: task.error,
    progress: task.status === 'completed' ? 100 : task.status === 'failed' ? 0 : undefined
  }
}

/**
 * 清理已完成的任务（可选，用于内存管理）
 * 
 * @param olderThan - 清理早于指定时间（毫秒）的任务，默认 1 小时
 */
export function cleanupTasks(olderThan: number = 3600000): void {
  const now = Date.now()
  const tasksToDelete: string[] = []
  
  taskStore.forEach((task, taskId) => {
    if (
      (task.status === 'completed' || task.status === 'failed') &&
      task.completedAt &&
      (now - task.completedAt) > olderThan
    ) {
      tasksToDelete.push(taskId)
    }
  })
  
  tasksToDelete.forEach(taskId => taskStore.delete(taskId))
  
  if (tasksToDelete.length > 0) {
    console.log(`清理了 ${tasksToDelete.length} 个旧任务`)
  }
}
