import { NextRequest, NextResponse } from 'next/server';

// ComfyUI API 配置
const COMFYUI_API_URL = 'https://sv-a367666e-b46e-409b-ace6-caabf1a46450-9001-x-defau-c1d8805f9f.sproxy.hd-01.alayanew.com:22443';

// ComfyUI 响应格式
interface ComfyUIHistoryItem {
  status: {
    status_str: string;  // 'success', 'failed', 'executing', 'queued'
    completed: boolean;
    error?: string;
    messages?: Array<[string, any]>;
  };
  outputs?: {
    [nodeId: string]: {
      images?: Array<{
        filename: string;
        subfolder: string;
        type: string;
      }>;
      animated?: boolean[];
    };
  };
}

interface ComfyUIHistoryResponse {
  [promptId: string]: ComfyUIHistoryItem;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: '缺少 taskId 参数' },
        { status: 400 }
      );
    }

    console.log(`[ComfyUI] 查询任务状态: ${taskId}`);

    // 查询任务历史
    const historyUrl = `${COMFYUI_API_URL}/api/history/${taskId}`;
    console.log(`[ComfyUI] 请求历史记录: ${historyUrl}`);

    const historyResponse = await fetch(historyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 添加超时控制
      signal: AbortSignal.timeout(10000),
    });

    if (!historyResponse.ok) {
      const errorText = await historyResponse.text();
      console.error(`[ComfyUI] 查询历史失败: ${errorText}`);

      // 如果是404，可能是任务还在队列中
      if (historyResponse.status === 404) {
        return NextResponse.json({
          status: 'queued',
          progress: 0,
          message: '任务正在排队中，请稍候...',
        });
      }

      throw new Error(`查询历史失败: ${errorText}`);
    }

    const historyData: ComfyUIHistoryResponse = await historyResponse.json();

    // 检查是否有输出
    const promptHistory = historyData[taskId];

    if (!promptHistory) {
      return NextResponse.json({
        status: 'queued',
        progress: 0,
        message: '任务正在排队中，请稍候...',
      });
    }

    // 解析任务状态
    const statusStr = promptHistory.status.status_str;
    const isCompleted = promptHistory.status.completed;

    console.log(`[ComfyUI] 任务状态: ${statusStr}, 完成: ${isCompleted}`);

    // 如果任务失败
    if (statusStr === 'failed' || promptHistory.status.error) {
      return NextResponse.json({
        status: 'failed',
        error: promptHistory.status.error || '视频生成失败',
      });
    }

    // 如果任务完成（success = true），提取视频 URL
    if (isCompleted && promptHistory.outputs) {
      // 查找 SaveVideo 节点的输出（节点 68）
      const saveVideoNode = promptHistory.outputs['68'];

      if (saveVideoNode && saveVideoNode.images && saveVideoNode.images.length > 0) {
        const videoInfo = saveVideoNode.images[0];
        
        // 直接返回 ComfyUI 原始视频 URL（客户端会通过 /api/video-proxy 代理访问）
        const videoUrl = `${COMFYUI_API_URL}/api/view?filename=${encodeURIComponent(videoInfo.filename)}&subfolder=${videoInfo.subfolder || 'video'}&type=${videoInfo.type || 'output'}`;
        
        console.log(`[ComfyUI] 视频生成成功: ${videoUrl}`);

        return NextResponse.json({
          status: 'completed',
          videoUrl: videoUrl,
          message: '视频生成完成',
        });
      }

      // 如果没有找到视频输出，但任务已完成
      console.warn('[ComfyUI] 任务完成但未找到视频输出');
      return NextResponse.json({
        status: 'completed',
        videoUrl: null,
        message: '视频生成完成，但未找到输出文件',
      });
    }

    // 检查是否有执行中的消息
    const isExecuting = statusStr === 'executing' || statusStr === 'running';
    const hasStarted = promptHistory.status.messages && promptHistory.status.messages.length > 0;

    if (isExecuting) {
      return NextResponse.json({
        status: 'processing',
        progress: hasStarted ? 50 : 10,
        message: '视频生成中...',
      });
    }

    // 任务还在队列中
    return NextResponse.json({
      status: 'queued',
      progress: 0,
      message: '任务正在排队中，请稍候...',
    });

  } catch (error) {
    console.error('[ComfyUI] 查询任务状态错误:', error);

    // 处理超时
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({
        status: 'timeout',
        error: '查询超时，请稍候重试',
      });
    }

    return NextResponse.json(
      { error: `查询失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
