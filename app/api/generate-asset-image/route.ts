/**
 * 资产图像生成 API
 * 使用 Nano Banana 为资产生成参考图像
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateImage, checkStatus } from '@/src/services/nanoBanana'
import { AssetCategory } from '@/types/assets'

/**
 * 构造图像生成提示词
 * @param description - 资产描述
 * @param category - 资产类别
 * @returns 完整的提示词（已增强风格后缀）
 */
function buildPrompt(description: string, category: AssetCategory): string {
  let prompt = description.trim()
  
  // 根据资产类别添加特定后缀
  if (category === AssetCategory.CHARACTER) {
    prompt += ', character sheet, front view'
  }
  
  // 统一添加 Apple 风格后缀（所有资产都使用）
  prompt += ', Apple-style minimalism, clean studio lighting, high-quality 3D render, soft shadows, white background'
  
  return prompt
}

/**
 * POST /api/generate-asset-image
 * 生成资产图像
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assetId, description, category, reference_image_id } = body
    
    if (!assetId || !description || !category) {
      return NextResponse.json(
        { error: '缺少必需参数: assetId, description, category' },
        { status: 400 }
      )
    }
    
    // 验证类别
    if (!Object.values(AssetCategory).includes(category as AssetCategory)) {
      return NextResponse.json(
        { error: '无效的资产类别' },
        { status: 400 }
      )
    }
    
    // 构造提示词
    const prompt = buildPrompt(description, category as AssetCategory)
    
    // 根据资产类别选择宽高比
    let aspectRatio = '21:9' // 默认电影比例
    if (category === AssetCategory.CHARACTER) {
      aspectRatio = '1:1' // 角色使用正方形
    } else if (category === AssetCategory.SCENE) {
      aspectRatio = '21:9' // 场景使用电影比例
    } else if (category === AssetCategory.PROP) {
      aspectRatio = '1:1' // 道具使用正方形
    }
    
    // 创建生成任务，传递参考图像 ID 和资产类别（如果提供）
    const task = await generateImage({
      prompt,
      aspect_ratio: aspectRatio,
      negative_prompt: 'low quality, blurry, distorted, watermark, text overlay',
      reference_image_id: reference_image_id || undefined, // 传递参考图像 ID 确保角色一致性
      category: category as 'character' | 'scene' | 'prop' // 传递资产类别，用于选择占位图
    })
    
    // 立即返回任务 ID，让前端进行异步轮询
    // 这样可以避免长时间等待导致的超时错误
    return NextResponse.json({
      success: true,
      assetId,
      taskId: task.taskId,
      status: 'pending',
      message: '图像生成任务已创建，正在处理中...'
    })
    
  } catch (error: any) {
    console.error('生成资产图像失败:', error)
    
    // 提供更有意义的错误提示
    let errorMessage = '视觉引擎正在维护，请稍后再试'
    
    // 根据错误类型提供更具体的提示
    if (error.message?.includes('API') || error.message?.includes('network')) {
      errorMessage = '网络连接异常，请检查网络后重试'
    } else if (error.message?.includes('key') || error.message?.includes('auth')) {
      errorMessage = 'API 密钥配置错误，请联系管理员'
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      errorMessage = 'API 调用次数已达上限，请稍后再试'
    } else if (error.message) {
      // 保留原始错误信息用于调试，但给用户友好的提示
      console.error('详细错误信息:', error.message)
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
