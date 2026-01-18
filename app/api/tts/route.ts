import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { HttpsProxyAgent } from 'https-proxy-agent'

/**
 * TTS (Text-to-Speech) API 路由
 * 使用 OpenAI 的 TTS API 将文本转换为语音
 * 模型：tts-1（快速）或 tts-1-hd（高质量）
 */

// 音色映射：将应用内的音色预设映射到 OpenAI 的音色
const VOICE_MAPPING: Record<string, 'onyx' | 'shimmer' | 'alloy' | 'echo' | 'fable' | 'nova'> = {
  // 男声音色 → onyx（深沉、磁性）
  'cold-male': 'onyx',
  'deep-male': 'onyx',
  'male': 'onyx',
  
  // 女声音色 → shimmer（温暖、清晰）
  'gentle-female': 'shimmer',
  'sweet': 'shimmer',
  'female': 'shimmer',
  
  // 机械/AI 音色 → alloy（中性、清晰）
  'ai-mechanical': 'alloy',
  'mechanical': 'alloy',
  
  // 默认音色
  'default': 'alloy',
}

/**
 * 获取 OpenAI 音色
 * @param voiceId - 应用内的音色 ID 或 OpenAI 标准音色 ID
 * @returns OpenAI 支持的音色名称
 */
function getOpenAIVoice(voiceId: string): 'onyx' | 'shimmer' | 'alloy' | 'echo' | 'fable' | 'nova' {
  // 如果直接是 OpenAI 标准音色 ID，直接返回
  const openAIVoices: Array<'onyx' | 'shimmer' | 'alloy' | 'echo' | 'fable' | 'nova'> = ['onyx', 'shimmer', 'alloy', 'echo', 'fable', 'nova']
  if (openAIVoices.includes(voiceId as any)) {
    return voiceId as 'onyx' | 'shimmer' | 'alloy' | 'echo' | 'fable' | 'nova'
  }
  
  // 否则使用映射表
  return VOICE_MAPPING[voiceId] || VOICE_MAPPING['default']
}

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId = 'default', model = 'tts-1' } = await request.json()

    // 验证输入
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: '请提供有效的文本内容' },
        { status: 400 }
      )
    }

    // 验证模型
    if (model !== 'tts-1' && model !== 'tts-1-hd') {
      return NextResponse.json(
        { error: '模型必须是 tts-1 或 tts-1-hd' },
        { status: 400 }
      )
    }

    // 获取 OpenAI API Key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: '未配置 OPENAI_API_KEY 环境变量' },
        { status: 500 }
      )
    }

    // 配置代理（开发环境）
    let httpAgent: HttpsProxyAgent | undefined = undefined
    if (process.env.NODE_ENV === 'development') {
      const proxyUrl = 'http://127.0.0.1:10081'
      httpAgent = new HttpsProxyAgent(proxyUrl)
    }

    // 初始化 OpenAI 客户端
    const openai = new OpenAI({
      apiKey: apiKey,
      httpAgent: httpAgent,
    })

    // 获取映射后的音色
    const voice = getOpenAIVoice(voiceId)

    // 调用 OpenAI TTS API
    const mp3 = await openai.audio.speech.create({
      model: model as 'tts-1' | 'tts-1-hd',
      voice: voice,
      input: text.trim(),
    })

    // 将响应转换为 ArrayBuffer
    const buffer = Buffer.from(await mp3.arrayBuffer())

    // 返回音频流
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // 缓存 1 小时
      },
    })
  } catch (error: any) {
    console.error('TTS API 错误:', error)
    
    // 处理 OpenAI API 错误
    if (error.response) {
      const status = error.response.status || 500
      const errorMessage = error.response.data?.error?.message || error.message || 'TTS 生成失败'
      
      return NextResponse.json(
        { error: errorMessage },
        { status: status }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'TTS 生成失败，请稍后重试' },
      { status: 500 }
    )
  }
}
