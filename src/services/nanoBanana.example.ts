/**
 * Nano Banana 图像生成服务使用示例
 */

import { generateImage, checkStatus, getTask } from './nanoBanana'

/**
 * 示例 1: 基本图像生成
 */
async function example1() {
  try {
    // 创建生成任务
    const response = await generateImage({
      prompt: 'A futuristic neon-lit cityscape at night with flying vehicles',
      aspect_ratio: '21:9' // 电影比例
    })
    
    console.log('任务已创建:', response.taskId)
    
    // 轮询直到完成
    const result = await checkStatus(response.taskId)
    
    if (result.status === 'completed' && result.imageUrl) {
      console.log('图像生成成功:', result.imageUrl)
      // 使用图像 URL（Base64 数据 URL）
    } else {
      console.error('生成失败:', result.error)
    }
  } catch (error) {
    console.error('错误:', error)
  }
}

/**
 * 示例 2: 带负向提示词的生成
 */
async function example2() {
  try {
    const response = await generateImage({
      prompt: 'A serene forest with sunbeams filtering through ancient trees',
      negative_prompt: 'people, buildings, cars, modern elements',
      aspect_ratio: '16:9'
    })
    
    // 手动轮询（不等待）
    let status = await getTask(response.taskId)
    while (status && status.status !== 'completed' && status.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 2000)) // 等待 2 秒
      status = await getTask(response.taskId)
      
      if (status) {
        console.log(`进度: ${status.progress}%`)
      }
    }
    
    if (status?.status === 'completed') {
      console.log('图像 URL:', status.imageUrl)
    }
  } catch (error) {
    console.error('错误:', error)
  }
}

/**
 * 示例 3: 使用参考图像保持一致性
 */
async function example3() {
  try {
    // 首先生成一张参考图像
    const referenceResponse = await generateImage({
      prompt: 'A character design: cyberpunk warrior with neon armor',
      aspect_ratio: '1:1'
    })
    
    const referenceResult = await checkStatus(referenceResponse.taskId)
    
    if (referenceResult.status === 'completed' && referenceResult.imageUrl) {
      // 保存参考图像 ID（实际项目中应保存到数据库）
      const referenceImageId = referenceResponse.taskId
      
      // 使用参考图像生成新图像
      const newResponse = await generateImage({
        prompt: 'The same character in a different pose, standing on a rooftop',
        aspect_ratio: '21:9',
        reference_image_id: referenceImageId
      })
      
      const newResult = await checkStatus(newResponse.taskId)
      console.log('新图像:', newResult.imageUrl)
    }
  } catch (error) {
    console.error('错误:', error)
  }
}

/**
 * 示例 4: 在 Next.js API 路由中使用
 */
// app/api/generate-image/route.ts
/*
import { NextRequest, NextResponse } from 'next/server'
import { generateImage, checkStatus } from '@/src/services/nanoBanana'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, negative_prompt, aspect_ratio, reference_image_id } = body
    
    // 创建任务
    const task = await generateImage({
      prompt,
      negative_prompt,
      aspect_ratio: aspect_ratio || '21:9',
      reference_image_id
    })
    
    return NextResponse.json({
      taskId: task.taskId,
      status: task.status
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    
    if (!taskId) {
      return NextResponse.json(
        { error: '缺少 taskId 参数' },
        { status: 400 }
      )
    }
    
    // 检查状态（带轮询）
    const status = await checkStatus(taskId)
    
    return NextResponse.json(status)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
*/
