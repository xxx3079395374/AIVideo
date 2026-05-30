import { NextRequest, NextResponse } from 'next/server';

// 任务状态存储（内存中，生产环境应使用 Redis 或数据库）
const taskStartTimes: Map<string, number> = new Map();

// 视频生成超时时间（5分钟）
export const VIDEO_GENERATION_TIMEOUT = 5 * 60 * 1000; // 5分钟

// 记录任务开始时间
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: '缺少 taskId 参数' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    taskStartTimes.set(taskId, startTime);

    console.log(`[TaskManager] 记录任务开始: ${taskId} at ${new Date(startTime).toISOString()}`);

    return NextResponse.json({
      success: true,
      taskId,
      startTime,
      timeout: VIDEO_GENERATION_TIMEOUT,
    });

  } catch (error) {
    console.error('[TaskManager] 记录任务失败:', error);
    return NextResponse.json(
      { error: `记录任务失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}

// 获取任务超时状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: '缺少 taskId 参数' },
        { status: 400 }
      );
    }

    const startTime = taskStartTimes.get(taskId);

    if (!startTime) {
      // 没有记录开始时间，不计算超时
      return NextResponse.json({
        isTimedOut: false,
        taskId,
      });
    }

    const elapsed = Date.now() - startTime;
    const isTimedOut = elapsed > VIDEO_GENERATION_TIMEOUT;

    console.log(`[TaskManager] 检查超时: ${taskId}, 已用时: ${elapsed}ms, 超时: ${isTimedOut}`);

    return NextResponse.json({
      isTimedOut,
      taskId,
      startTime,
      elapsed,
      timeout: VIDEO_GENERATION_TIMEOUT,
    });

  } catch (error) {
    console.error('[TaskManager] 检查超时失败:', error);
    return NextResponse.json(
      { error: `检查超时失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
