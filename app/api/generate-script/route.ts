import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { setGlobalDispatcher, ProxyAgent } from 'undici'
import { SCRIPT_GENERATION_PROMPT } from '@/app/prompts'

/**
 * AI 生成剧本场景的 API 路由
 * 使用 Google Gemini API (@google/generative-ai)
 * 通过本地代理服务器转发请求
 */

// 在文件顶部设置全局代理
if (process.env.NODE_ENV === 'development') {
  const proxyAgent = new ProxyAgent('http://127.0.0.1:10081')
  setGlobalDispatcher(proxyAgent)
}

interface Scene {
  sceneNumber: number
  content: string
  dialogue: string
  vfx_suggestion: string
  duration: number
}

/**
 * 统一的 JSON 解析辅助函数
 * 包含清理不可见字符和容错解析逻辑
 * @param text - AI 返回的文本内容
 * @returns 解析后的 JSON 对象
 */
function parseJsonResponse(text: string): any {
  if (!text) {
    throw new Error('未收到有效的响应内容')
  }

  // 清理不可见字符
  const cleanedText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')

  try {
    // 第一次尝试：直接解析
    return JSON.parse(cleanedText)
  } catch (e) {
    // 如果解析失败，尝试用正则提取第一个 [ 和最后一个 ] 之间的内容
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch (parseError) {
        throw new Error('AI 返回格式错误：无法解析 JSON 数组')
      }
    }
    
    // 如果数组匹配失败，尝试匹配对象
    const objectMatch = cleanedText.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0])
      } catch (parseError) {
        throw new Error('AI 返回格式错误：无法解析 JSON 对象')
      }
    }
    
    throw new Error('AI 返回格式错误：未找到有效的 JSON 内容')
  }
}

/**
 * 创建配置好的 Gemini 模型实例
 * 统一配置格式，确保使用 JSON 模式
 */
function createGeminiModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  // 在调用 getGenerativeModel 时增加约束
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      // 2026 年最新推荐：强制要求 JSON 模式（如果接口支持）
      responseMimeType: "application/json",
      temperature: 0.8,
    }
  }, {
    apiVersion: 'v1beta', // v1beta 支持 responseMimeType
  })
  return model
}

/**
 * 统一的错误处理函数
 */
function handleApiError(error: any): Error {
  const errorMessage = error.message || String(error)
  
  if (errorMessage.includes('API key') || errorMessage.includes('API_KEY')) {
    return new Error('API Key 无效或未配置')
  }
  
  if (errorMessage.includes('quota') || 
      errorMessage.includes('rate limit') || 
      errorMessage.includes('RATE_LIMIT') ||
      errorMessage.includes('QUOTA_EXCEEDED')) {
    return new Error('API 配额已用完或达到速率限制')
  }
  
  if (errorMessage.includes('fetch') || 
      errorMessage.includes('network') || 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('timeout')) {
    return new Error('网络连接失败，请检查代理设置或网络连接')
  }
  
  return new Error(errorMessage || '生成剧本时发生未知错误')
}

/**
 * 验证和转换场景数据
 * 将 API 返回的字段映射到标准 Scene 格式
 */
function normalizeScenes(parsed: any): Scene[] {
  // 处理可能的嵌套结构
  let scenes: any[] = []
  if (Array.isArray(parsed)) {
    scenes = parsed
  } else if (parsed.scenes && Array.isArray(parsed.scenes)) {
    scenes = parsed.scenes
  } else if (parsed.data && Array.isArray(parsed.data)) {
    scenes = parsed.data
  } else {
    const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]))
    if (arrayKey) {
      scenes = parsed[arrayKey]
    }
  }

  if (scenes.length === 0) {
    throw new Error('未生成任何场景数据')
  }

  // 验证和转换场景数据
  // 注意：API 返回的字段是 visual_description 和 motion_guidance
  // 但我们需要映射到 content 和 vfx_suggestion 以保持与现有数据结构的兼容性
  return scenes.map((scene: any, index: number) => ({
    sceneNumber: scene.sceneNumber || index + 1,
    content: scene.visual_description || scene.content || '',
    dialogue: scene.dialogue || '',
    vfx_suggestion: scene.motion_guidance || scene.vfx_suggestion || '',
    duration: typeof scene.duration === 'number' ? scene.duration : 5.0,
  }))
}

/**
 * 生成剧本场景的核心函数
 * @param prompt - 完整的提示词
 * @param systemInstruction - 系统指令
 */
async function generateScenesWithRetry(
  model: any,
  prompt: string,
  systemInstruction: string
): Promise<Scene[]> {
  // 将系统指令和用户提示词组合
  const combinedPrompt = `${systemInstruction}\n\n${prompt}`
  
  try {
    const result = await model.generateContent(combinedPrompt)
    const response = await result.response
    const text = response.text()

    // 使用统一的 JSON 解析函数
    let parsed: any
    try {
      parsed = parseJsonResponse(text)
    } catch (parseError: any) {
      // 如果解析失败，请求 Gemini 重新格式化一次
      const reformatPrompt = `请将以下内容重新格式化为有效的 JSON 数组，确保：
1. 移除所有 Markdown 代码块标记（如 \`\`\`json）
2. 确保所有字符串都正确转义
3. 确保 JSON 格式完全有效

原始内容：
${text}

请只返回 JSON 数组，不要包含任何其他文字。`
      
      const reformatResult = await model.generateContent(reformatPrompt)
      const reformatResponse = await reformatResult.response
      const reformattedText = reformatResponse.text()
      
      // 再次尝试解析
      parsed = parseJsonResponse(reformattedText)
    }

    // 验证和转换场景数据
    return normalizeScenes(parsed)
  } catch (error: any) {
    throw handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, singleScene = false, storyOutline, adaptedStory } = await request.json()

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: '未配置 GOOGLE_GENERATIVE_AI_API_KEY 环境变量' },
        { status: 500 }
      )
    }

    const model = createGeminiModel(apiKey)
    let generatedScenes: Scene[] = []

    // 支持三种模式：adaptedStory（改编后的故事）、storyOutline（故事大纲）、或直接提示词
    if (adaptedStory && typeof adaptedStory === 'string') {
      // 基于改编后的故事生成剧本
      const fullPrompt = SCRIPT_GENERATION_PROMPT(adaptedStory)
      const systemInstruction = `你是一个专业的剧本创作助手。基于用户提供的改编后的故事，生成详细的、分场景的剧本。

每个场景必须包含以下字段：
- sceneNumber: 场景编号（从 1 开始）
- visual_description: 极其详细的画面描述（包含环境、灯光、主体动作），用于生图提示词
- dialogue: 旁白或对白（如果没有则为空字符串）
- motion_guidance: 镜头运动建议（如：Slow zoom in, Handheld shake）

必须返回有效的 JSON 数组格式，不要包含任何多余的解释或 Markdown 代码块。`

      generatedScenes = await generateScenesWithRetry(model, fullPrompt, systemInstruction)
    } else if (storyOutline) {
      // 基于故事大纲生成剧本
      // 支持新旧两种数据结构
      let outlineDescription = ''
      
      if (storyOutline.story_outline && storyOutline.assets) {
        // 新数据结构
        const characters = storyOutline.assets.characters?.map((c: any) => `${c.name}: ${c.description}`).join('\n') || ''
        const props = storyOutline.assets.props?.map((p: any) => `${p.name}: ${p.visualDetails}`).join('\n') || ''
        const scenes = storyOutline.assets.scenes?.map((s: any) => `${s.name}: ${s.description}`).join('\n') || ''
        
        outlineDescription = `故事大纲：
${storyOutline.story_outline}

视觉基调：${storyOutline.assets.theme || ''}

角色清单：
${characters}

道具清单：
${props}

场景清单：
${scenes}`
      } else {
        // 兼容旧数据结构
        outlineDescription = `主题：${storyOutline.theme || ''}

角色设定：
${storyOutline.characterSettings || ''}

三幕式大纲：
第一幕：${storyOutline.threeActOutline?.act1 || ''}
第二幕：${storyOutline.threeActOutline?.act2 || ''}
第三幕：${storyOutline.threeActOutline?.act3 || ''}`
      }

      const fullPrompt = SCRIPT_GENERATION_PROMPT(outlineDescription)
      const systemInstruction = `你是一个专业的剧本创作助手。基于用户提供的改编好的故事大纲，生成详细的、分场景的剧本。

请根据三幕式大纲，将每个幕拆分为多个场景，确保：
1. 第一幕（开场和冲突建立）拆分为 2-3 个场景
2. 第二幕（冲突发展和转折）拆分为 3-5 个场景
3. 第三幕（高潮和结局）拆分为 2-3 个场景

每个场景必须包含以下字段：
- sceneNumber: 场景编号（从 1 开始）
- visual_description: 极其详细的画面描述（包含环境、灯光、主体动作），用于生图提示词
- dialogue: 旁白或对白（如果没有则为空字符串）
- motion_guidance: 镜头运动建议（如：Slow zoom in, Handheld shake）

必须返回有效的 JSON 数组格式，不要包含任何多余的解释或 Markdown 代码块。`

      generatedScenes = await generateScenesWithRetry(model, fullPrompt, systemInstruction)
    } else if (prompt && typeof prompt === 'string') {
      // 原有的提示词模式
      const systemInstruction = singleScene
        ? `你是一个专业的剧本创作助手。根据用户提供的场景描述，生成一个场景的剧本。

场景必须包含以下字段：
- sceneNumber: 场景编号（固定为 1）
- content: 视觉画面描述（详细描述场景的视觉元素，用于后续生成分镜）
- dialogue: 旁白或对白（如果有对话，使用引号；如果是旁白，直接描述）
- vfx_suggestion: 特效或运镜建议（如"推镜头"、"低头视角"、"环绕镜头"等）
- duration: 预计时长（秒，建议 3-8 秒之间）

请以 JSON 数组格式返回（只包含一个场景对象）。`
        : `你是一个专业的剧本创作助手。根据用户提供的故事梗概，生成 3-5 个场景的剧本。

每个场景必须包含以下字段：
- sceneNumber: 场景编号（从 1 开始）
- content: 视觉画面描述（详细描述场景的视觉元素，用于后续生成分镜）
- dialogue: 旁白或对白（如果有对话，使用引号；如果是旁白，直接描述）
- vfx_suggestion: 特效或运镜建议（如"推镜头"、"低头视角"、"环绕镜头"等）
- duration: 预计时长（秒，建议 3-8 秒之间）

请以 JSON 数组格式返回，确保每个场景都有完整的字段。`

      const fullPrompt = `请根据以下${singleScene ? '场景描述' : '故事梗概'}生成剧本场景：\n\n${prompt}\n\n请返回 JSON 数组格式的场景数据。`
      generatedScenes = await generateScenesWithRetry(model, fullPrompt, systemInstruction)
    } else {
      return NextResponse.json(
        { error: '请提供有效的提示词、故事大纲或改编后的故事' },
        { status: 400 }
      )
    }

    return NextResponse.json({ scenes: generatedScenes })
  } catch (error: any) {
    // 返回清晰的错误信息给客户端
    const errorMessage = error.message || '生成失败，请稍后重试'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
