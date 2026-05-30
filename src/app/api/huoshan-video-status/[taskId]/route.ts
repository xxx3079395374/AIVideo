import { NextRequest, NextResponse } from 'next/server';

// 火山引擎 API 配置
const VOLCENGINE_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: '缺少任务 ID' },
        { status: 400 }
      );
    }

    // 从环境变量获取 API Key
    const apiKey = process.env.VOLCENGINE_API_KEY || '0e4f6f6d-18fc-4e2b-841f-292a4c0ff232';

    // 查询火山引擎任务状态
    const response = await fetch(`${VOLCENGINE_API_URL}/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('查询火山引擎视频状态错误:', errorText);
      return NextResponse.json(
        { error: '查询视频状态失败', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 映射状态
    // 火山引擎状态: pending, processing, succeeded, failed
    // 我们的状态: pending, generating, completed, failed
    let status: 'pending' | 'generating' | 'completed' | 'failed';
    switch (data.status) {
      case 'pending':
        status = 'pending';
        break;
      case 'processing':
        status = 'generating';
        break;
      case 'succeeded':
        status = 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
      default:
        status = 'pending';
    }

    return NextResponse.json({
      success: true,
      taskId: data.id,
      status,
      videoUrl: data.content?.video_url || null,
      resolution: data.resolution,
      duration: data.duration,
    });
  } catch (error) {
    console.error('查询火山引擎视频状态错误:', error);
    return NextResponse.json(
      { error: '查询火山引擎视频状态服务异常' },
      { status: 500 }
    );
  }
}
