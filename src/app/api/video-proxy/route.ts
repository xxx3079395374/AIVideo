import { NextRequest, NextResponse } from 'next/server';

// ComfyUI API 配置
const COMFYUI_API_URL = 'https://sv-a367666e-b46e-409b-ace6-caabf1a46450-9001-x-defau-c1d8805f9f.sproxy.hd-01.alayanew.com:22443';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');

    if (!videoUrl) {
      return NextResponse.json(
        { error: '缺少视频 URL 参数' },
        { status: 400 }
      );
    }

    console.log(`[VideoProxy] 代理视频请求: ${videoUrl}`);

    // 验证 URL 是否来自 ComfyUI
    if (!videoUrl.startsWith(COMFYUI_API_URL)) {
      return NextResponse.json(
        { error: '无效的视频 URL' },
        { status: 400 }
      );
    }

    // 获取视频文件
    const response = await fetch(videoUrl, {
      headers: {
        // 添加必要的请求头
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
      },
      // 添加超时
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VideoProxy] 获取视频失败: ${errorText}`);
      throw new Error(`获取视频失败: ${response.status}`);
    }

    // 获取视频内容
    const videoBuffer = await response.arrayBuffer();
    const videoContentType = response.headers.get('content-type') || 'video/mp4';

    console.log(`[VideoProxy] 视频获取成功, 大小: ${videoBuffer.byteLength} bytes, 类型: ${videoContentType}`);

    // 返回视频内容，添加 CORS 头
    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': videoContentType,
        'Content-Length': videoBuffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('[VideoProxy] 代理视频错误:', error);

    // 处理超时
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: '视频加载超时' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: `视频加载失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}

// 处理 OPTIONS 请求（CORS 预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
