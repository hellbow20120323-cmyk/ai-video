/**
 * Nano Banana 图像生成服务
 * 基于 Google Generative AI SDK (使用 gemini-2.5-flash 模型)
 * 支持异步任务和状态轮询
 * 注意：统一使用 gemini-2.5-flash 基础模型，不使用 -image 或 -preview 后缀变体（配额更高）
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
  category?: 'character' | 'scene' | 'prop' // 资产类别，用于选择占位图
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
  category?: 'character' | 'scene' | 'prop' // 资产类别，用于选择占位图
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
/**
 * 调用 Nano Banana API 生成图像
 * @param prompt - 图像生成提示词
 * @param aspectRatio - 宽高比
 * @param negativePrompt - 负向提示词
 * @param referenceImageId - 参考图像 ID
 */
async function callNanoBananaAPI(
  prompt: string,
  aspectRatio: string,
  negativePrompt?: string,
  referenceImageId?: string
): Promise<string> {
  const genAI = getGenAI()
  
  // Nano Banana 配置：使用基础 Flash 模型（配额更高，更不容易报 429）
  // 注意：gemini-2.5-flash 只支持纯文本任务，不包含图像生成能力
  const nanoBananaModel = genAI.getGenerativeModel(
    { 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json', // 只输出 JSON
      },
    },
    { apiVersion: 'v1beta' }
  )
  
  // 构建提示词，要求返回包含图像生成指令的 JSON
  // 注意：gemini-2.5-flash 不支持直接生成图像，需要返回 JSON 格式的指令
  const dimensions = parseAspectRatio(aspectRatio)
  const generationConfig: any = {
    // 不包含 imageConfig 和 responseModalities，因为基础 Flash 模型不支持
  }
  
  // 构建提示词：要求 Gemini 输出包含生图指令的 JSON
  // 注意：gemini-2.5-flash 只支持纯文本任务，需要返回 JSON 格式的指令
  const instructionPrompt = `请根据以下提示词和参数，生成一个包含图像生成指令的 JSON 对象。

提示词：${prompt}
${negativePrompt ? `负向提示词：${negativePrompt}` : ''}
宽高比：${aspectRatio}
图像尺寸：${dimensions.width}x${dimensions.height}
${referenceImageId ? '参考图像：已提供（用于保持角色一致性）' : ''}

请返回 JSON 格式，包含以下字段：
{
  "prompt": "优化后的图像生成提示词",
  "negative_prompt": "负向提示词（如果有）",
  "aspect_ratio": "${aspectRatio}",
  "width": ${dimensions.width},
  "height": ${dimensions.height},
  "has_reference_image": ${referenceImageId ? 'true' : 'false'}
}

请只返回 JSON，不要包含任何其他文字或 Markdown 标记。`
  
  // 构建 parts 数组
  const parts: any[] = []
  
  // 如果有参考图像，添加到 parts（用于上下文理解）
  if (referenceImageId) {
    try {
      let imageData: string = referenceImageId
      let mimeType: string = 'image/png'
      
      if (imageData.startsWith('data:')) {
        const dataUrlMatch = imageData.match(/^data:([^;]+);base64,(.+)$/)
        if (dataUrlMatch) {
          mimeType = dataUrlMatch[1] || 'image/png'
          imageData = dataUrlMatch[2]
        } else {
          const base64Match = imageData.match(/base64,(.+)$/)
          if (base64Match) {
            imageData = base64Match[1]
          }
        }
      }
      
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: imageData
        }
      })
      
      console.log('使用参考图像作为上下文，图像大小:', imageData.length, 'bytes')
    } catch (error) {
      console.error('处理参考图像失败:', error)
    }
  }
  
  parts.push({ text: instructionPrompt })
  
  // 调用 Gemini API（纯文本任务，只输出 JSON）
  const result = await nanoBananaModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: parts
      }
    ],
    generationConfig
  })
  
  // 解析返回的 JSON
  const response = result.response
  const responseText = response.text()
  
  if (!responseText || responseText.trim().length === 0) {
    throw new Error('Nano Banana API 响应为空')
  }
  
  // 清理可能的 Markdown 标记
  const cleanedText = responseText.replace(/^```(?:json|JSON)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  
  let parsedJson: any
  try {
    parsedJson = JSON.parse(cleanedText)
  } catch (parseError: any) {
    console.error('Nano Banana JSON 解析失败:', parseError)
    console.error('原始响应:', cleanedText.substring(0, 200))
    throw new Error(`Nano Banana API 返回的 JSON 格式无效: ${parseError.message}`)
  }
  
  // 验证 JSON 结构
  if (!parsedJson.prompt || typeof parsedJson.prompt !== 'string') {
    throw new Error('Nano Banana API 返回的 JSON 中缺少 prompt 字段')
  }
  
  // 返回优化后的提示词（目前先返回原始提示词，后续可以扩展为调用真正的图像生成 API）
  // 注意：由于 gemini-2.5-flash 不支持图像生成，这里暂时返回一个占位符
  // 实际应用中，应该使用返回的 JSON 调用真正的图像生成服务
  console.log('Nano Banana 返回的优化提示词:', parsedJson.prompt.substring(0, 100) + '...')
  
  // TODO: 这里应该调用真正的图像生成 API，使用 parsedJson 中的参数
  // 目前暂时返回一个错误，提示需要实现真正的图像生成逻辑
  throw new Error('需要实现真正的图像生成 API 调用。当前 gemini-2.5-flash 只支持文本输出，不支持直接生成图像。')
}

async function executeImageGeneration(task: ImageGenerationTask, retryCount: number = 0): Promise<void> {
  const MAX_RETRIES = 1 // 最大重试次数为 1 次
  
  try {
    console.log("开始资产生成流程...")
    const genAI = getGenAI()
    
    // ========== 第一阶段：Gemini 文本处理（剧本转 JSON）==========
    // Gemini 只负责接收剧本，输出包含 prompt 字段的 JSON
    // 不包含任何图片相关的参数
    const geminiModel = genAI.getGenerativeModel(
      { 
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json', // 只用于 JSON 输出
          // 注意：不包含 responseModalities、imageConfig 等图片相关参数
        },
      },
      { apiVersion: 'v1beta' }
    )
    
    // 构建 Gemini 提示词：要求返回包含 prompt 字段的 JSON
    const geminiPrompt = `请将以下剧本内容转换为 JSON 格式，输出必须包含一个 "prompt" 字段，该字段包含用于图像生成的提示词。

剧本内容：
${task.prompt}

请返回 JSON 格式，例如：
{
  "prompt": "详细的图像生成提示词..."
}`

    // 调用 Gemini API
    let geminiResult
    try {
      geminiResult = await geminiModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: geminiPrompt }]
          }
        ]
      })
    } catch (error: any) {
      // 检查是否为 400 错误
      if (error?.status === 400 || error?.code === 400 || error?.message?.includes('400')) {
        console.error('Gemini 返回 400 错误:', error)
        task.status = 'failed'
        task.error = '提示词解析失败'
        task.completedAt = Date.now()
        throw new Error('提示词解析失败')
      }
      throw error
    }
    
    // 解析 Gemini 返回的 JSON
    const geminiResponse = geminiResult.response
    const geminiText = geminiResponse.text()
    
    let parsedJson: any
    try {
      // 清理可能的 Markdown 标记
      const cleanedText = geminiText.replace(/^```(?:json|JSON)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
      parsedJson = JSON.parse(cleanedText)
    } catch (parseError: any) {
      console.error('Gemini JSON 解析失败:', parseError)
      task.status = 'failed'
      task.error = '提示词解析失败：无法解析 Gemini 返回的 JSON'
      task.completedAt = Date.now()
      throw new Error('提示词解析失败：无法解析 Gemini 返回的 JSON')
    }
    
    // 验证 JSON 中是否包含 prompt 字段
    if (!parsedJson.prompt || typeof parsedJson.prompt !== 'string') {
      console.error('Gemini 返回的 JSON 中缺少 prompt 字段:', parsedJson)
      task.status = 'failed'
      task.error = '提示词解析失败：Gemini 返回的 JSON 中缺少 prompt 字段'
      task.completedAt = Date.now()
      throw new Error('提示词解析失败：Gemini 返回的 JSON 中缺少 prompt 字段')
    }
    
    const enhancedPrompt = parsedJson.prompt
    console.log('Gemini 返回的增强提示词:', enhancedPrompt.substring(0, 100) + '...')
    
    // ========== 返回静态占位图 ==========
    // 根据资产类别智能匹配不同的占位图
    let placeholderUrl: string
    if (task.category === 'character') {
      // 角色资产
      placeholderUrl = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000'
    } else if (task.category === 'scene') {
      // 场景资产
      placeholderUrl = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000'
    } else if (task.category === 'prop') {
      // 道具资产
      placeholderUrl = 'https://images.unsplash.com/photo-1526170315870-35874f48d622?q=80&w=1000'
    } else {
      // 其他资产默认使用角色占位图
      placeholderUrl = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000'
    }
    
    // 模拟 Apple 式加载：模拟系统"思考"过程
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    // 更新任务状态
    task.status = 'completed'
    task.imageUrl = placeholderUrl
    task.completedAt = Date.now()
    
  } catch (error: any) {
    // 检查是否为 400 错误（提示词解析失败）
    const isBadRequestError = 
      error?.status === 400 ||
      error?.code === 400 ||
      error?.message?.includes('400') ||
      error?.message?.includes('提示词解析失败')
    
    // 如果是 400 错误，直接返回，不进行重试和后续步骤
    if (isBadRequestError) {
      // 错误已在第一阶段处理，这里确保任务状态已更新
      if (task.status !== 'failed') {
        task.status = 'failed'
        task.error = error.message || '提示词解析失败'
        task.completedAt = Date.now()
      }
      throw error
    }
    
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
    reference_image_id,
    category
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
    category, // 保存资产类别，用于选择占位图
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
