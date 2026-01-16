import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { setGlobalDispatcher, ProxyAgent } from 'undici'
import { ADAPTATION_PROMPT } from '@/app/prompts'

/**
 * 故事改编 API 路由
 * 将用户输入的内容改编为适合短视频拍摄的故事大纲
 * 使用 Google Gemini API (@google/generative-ai)
 * 通过本地代理服务器转发请求
 */

// 在文件顶部设置全局代理
if (process.env.NODE_ENV === 'development') {
  const proxyAgent = new ProxyAgent('http://127.0.0.1:10081')
  setGlobalDispatcher(proxyAgent)
}

interface Character {
  name: string
  description: string
}

interface Prop {
  name: string
  description: string
}

interface Scene {
  name: string
  description: string
}

interface Theme {
  visual_style: string
  color_palette: string
}

interface StoryAdaptation {
  story_outline: string
  assets: {
    characters: Character[]
    props: Prop[]
    scenes: Scene[]
    theme: Theme
  }
}

export async function POST(request: NextRequest) {
  try {
    const { originalContent } = await request.json()

    if (!originalContent || typeof originalContent !== 'string') {
      return NextResponse.json(
        { error: '请提供有效的原始内容' },
        { status: 400 }
      )
    }

    const adaptation = await adaptStoryWithGemini(originalContent)

    return NextResponse.json({ adaptation })
  } catch (error: any) {
    // 返回清晰的错误信息给客户端
    const errorMessage = error.message || '改编失败，请稍后重试'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * 使用 Google Gemini API 改编故事
 * @param originalContent - 用户输入的原始内容
 */
async function adaptStoryWithGemini(originalContent: string): Promise<StoryAdaptation> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (!apiKey) {
    throw new Error('未配置 GOOGLE_GENERATIVE_AI_API_KEY 环境变量')
  }

  // 初始化 Gemini AI（会自动使用在文件顶部设置的全局代理）
  // 使用 v1beta API 版本以支持 responseMimeType 配置
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel(
    { 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.8,
        responseMimeType: 'application/json',
      },
    },
    {
      apiVersion: 'v1beta', // 明确指定 API 版本，v1beta 支持 responseMimeType
    }
  )

  // 使用统一的提示词模板
  const fullPrompt = ADAPTATION_PROMPT(originalContent)
  
  // 设置系统指令，明确输出格式要求
  const systemInstruction = `你是一个专业的短视频故事改编专家。请严格按照以下 JSON 格式输出，不要包含任何 Markdown 代码块标记（如 \`\`\`json）：

{
  "story_outline": "完整的故事大纲内容（包含三幕式结构：起、承、转、合）",
  "assets": {
    "characters": [
      {
        "name": "角色名称",
        "description": "角色外貌特征描述（详细描述外观、服装、特征等）"
      }
    ],
    "props": [
      {
        "name": "道具名称",
        "description": "道具的视觉细节描述（材质、大小、颜色、形状、特殊效果等）"
      }
    ],
    "scenes": [
      {
        "name": "场景名称（如：破旧实验室、雨夜街头）",
        "description": "场景的详细描述（环境、灯光、氛围、关键元素等）"
      }
    ],
    "theme": {
      "visual_style": "视觉风格描述（如：赛博朋克、极简主义、水墨风、3D粘土、新海诚动画风等）",
      "color_palette": "色彩调色板描述（如：高对比度霓虹色、柔和暖色调、冷色调、黑白灰等）"
    }
  }
}

要求：
1. story_outline 应该是一个完整的故事大纲，包含三幕式结构（起、承、转、合）
2. characters 数组应包含 1-3 个核心角色，每个角色需要详细的外貌特征描述（外观、服装、特征等）
3. props 数组应包含关键道具，每个道具需要详细的视觉细节（材质、大小、颜色、形状、特殊效果等）
4. scenes 数组应包含核心场景，每个场景需要清晰的名称和详细描述（环境、灯光、氛围等）
5. theme 必须是一个对象，包含 visual_style 和 color_palette 两个字段
6. 必须返回有效的 JSON 格式，不要包含任何多余的解释、注释或 Markdown 代码块
7. 确保所有字符串都正确转义，JSON 格式完全有效`

  try {
    // 将系统指令和用户提示词组合
    const combinedPrompt = `${systemInstruction}\n\n${fullPrompt}`
    const result = await model.generateContent(combinedPrompt)
    const response = await result.response
    let content = response.text()

    if (!content) {
      throw new Error('未收到有效的响应内容')
    }

    // 清理不可见字符和可能的 Markdown 代码块标记
    let cleanedContent = content
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除不可见字符
      .replace(/```json\s*/g, '') // 移除开头的 ```json
      .replace(/```\s*/g, '') // 移除结尾的 ```
      .trim()

    // 解析 JSON 响应（带容错逻辑）
    let parsed: any
    try {
      // 第一次尝试：直接解析
      parsed = JSON.parse(cleanedContent)
    } catch (firstError) {
      try {
        // 第二次尝试：提取 JSON 对象部分（使用更精确的正则）
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('无法找到有效的 JSON 对象')
        }
      } catch (secondError) {
        // 第三次尝试：请求 Gemini 重新格式化
        try {
          const reformatPrompt = `请将以下内容重新格式化为有效的 JSON 对象，严格按照以下格式：

{
  "story_outline": "...",
  "assets": {
    "characters": [...],
    "props": [...],
    "scenes": [...],
    "theme": {
      "visual_style": "...",
      "color_palette": "..."
    }
  }
}

要求：
1. 移除所有 Markdown 代码块标记（如 \`\`\`json）
2. 确保所有字符串都正确转义（使用双引号）
3. 确保 JSON 格式完全有效
4. theme 必须是一个对象，包含 visual_style 和 color_palette 字段

原始内容：
${cleanedContent.substring(0, 2000)}${cleanedContent.length > 2000 ? '...' : ''}

请只返回 JSON 对象，不要包含任何其他文字、注释或解释。`
          
          const reformatResult = await model.generateContent(reformatPrompt)
          const reformatResponse = await reformatResult.response
          const reformattedText = reformatResponse.text()
          
          if (!reformattedText) {
            throw new Error('重新格式化后未收到有效响应')
          }
          
          // 清理重新格式化的内容
          const cleanedReformat = reformattedText
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim()
          
          // 尝试解析重新格式化的内容
          const reformatJsonMatch = cleanedReformat.match(/\{[\s\S]*\}/)
          if (reformatJsonMatch) {
            parsed = JSON.parse(reformatJsonMatch[0])
          } else {
            throw new Error('重新格式化后仍无法解析 JSON')
          }
        } catch (reformatError) {
          // 所有解析尝试都失败
          throw new Error(
            `JSON 解析失败：${firstError instanceof Error ? firstError.message : String(firstError)}。` +
            `原始内容前 500 字符：${cleanedContent.substring(0, 500)}`
          )
        }
      }
    }

    // 验证和转换数据
    // 处理 theme：支持新格式（对象）和旧格式（字符串）的兼容
    let theme: Theme
    if (typeof parsed.assets?.theme === 'object' && parsed.assets.theme !== null) {
      // 新格式：对象
      theme = {
        visual_style: parsed.assets.theme.visual_style || parsed.assets.theme.visualStyle || '',
        color_palette: parsed.assets.theme.color_palette || parsed.assets.theme.colorPalette || '',
      }
    } else if (typeof parsed.assets?.theme === 'string') {
      // 旧格式：字符串（向后兼容）
      theme = {
        visual_style: parsed.assets.theme,
        color_palette: '',
      }
    } else {
      // 默认值
      theme = {
        visual_style: '',
        color_palette: '',
      }
    }

    const adaptation: StoryAdaptation = {
      story_outline: parsed.story_outline || '',
      assets: {
        characters: Array.isArray(parsed.assets?.characters) 
          ? parsed.assets.characters.map((char: any) => ({
              name: String(char.name || '').trim(),
              description: String(char.description || '').trim(),
            }))
          : [],
        props: Array.isArray(parsed.assets?.props)
          ? parsed.assets.props.map((prop: any) => ({
              name: String(prop.name || '').trim(),
              description: String(prop.description || prop.visualDetails || '').trim(),
            }))
          : [],
        scenes: Array.isArray(parsed.assets?.scenes)
          ? parsed.assets.scenes.map((scene: any) => ({
              name: String(scene.name || '').trim(),
              description: String(scene.description || '').trim(),
            }))
          : [],
        theme,
      },
    }

    // 验证必要字段
    if (!adaptation.story_outline || !adaptation.story_outline.trim()) {
      throw new Error('AI 返回的数据不完整，缺少必要字段 story_outline')
    }

    if (!adaptation.assets.theme.visual_style || !adaptation.assets.theme.visual_style.trim()) {
      throw new Error('AI 返回的数据不完整，缺少必要字段 assets.theme.visual_style')
    }

    return adaptation
  } catch (error: any) {
    // 处理 Gemini API 特定的错误类型
    const errorMessage = error.message || String(error)
    
    // API Key 相关错误
    if (errorMessage.includes('API key') || errorMessage.includes('API_KEY')) {
      throw new Error('API Key 无效或未配置')
    }
    
    // 配额和速率限制错误
    if (errorMessage.includes('quota') || 
        errorMessage.includes('rate limit') || 
        errorMessage.includes('RATE_LIMIT') ||
        errorMessage.includes('QUOTA_EXCEEDED')) {
      throw new Error('API 配额已用完或达到速率限制')
    }
    
    // 网络或连接错误
    if (errorMessage.includes('fetch') || 
        errorMessage.includes('network') || 
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('timeout')) {
      throw new Error('网络连接失败，请检查代理设置或网络连接')
    }
    
    // 其他错误，返回原始错误信息或通用错误
    throw new Error(errorMessage || '改编故事时发生未知错误')
  }
}
