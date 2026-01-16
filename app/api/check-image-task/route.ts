/**
 * 图像生成任务状态检查 API
 * 用于前端轮询任务状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTask } from '@/src/services/nanoBanana'

/**
 * GET /api/check-image-task?taskId=xxx
 * 检查图像生成任务状态
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get('taskId')
    
    if (!taskId) {
      return NextResponse.json(
        { error: '缺少必需参数: taskId' },
        { status: 400 }
      )
    }
    
    // 获取任务状态（不轮询，只返回当前状态）
    const taskStatus = getTask(taskId)
    
    if (!taskStatus) {
      return NextResponse.json(
        { 
          error: '任务不存在或已过期',
          status: 'not_found'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      ...taskStatus
    })
    
  } catch (error: any) {
    console.error('检查任务状态失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '检查任务状态时发生错误',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
