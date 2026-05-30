import { NextRequest, NextResponse } from 'next/server';

// 火山引擎 API 配置
const VOLCENGINE_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

interface GenerateVideoRequest {
  startFrameUrl: string;
  endFrameUrl: string;
  startFramePrompt: string;
  endFramePrompt: string;
  duration?: number; // 视频时长（秒），可选值：5, 10, 15
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateVideoRequest = await request.json();
    const { startFrameUrl, endFrameUrl, startFramePrompt, endFramePrompt, duration = 5 } = body;

    // 验证必填参数
    if (!startFrameUrl || !endFrameUrl) {
      return NextResponse.json(
        { error: '缺少首帧或尾帧图片 URL' },
        { status: 400 }
      );
    }

    // 组合提示词
    const combinedPrompt = `${startFramePrompt}。${endFramePrompt}。确保首尾帧衔接合理。`;

    // 从环境变量获取 API Key，如果没有则使用默认值（仅用于开发）
    const apiKey = process.env.VOLCENGINE_API_KEY || '0e4f6f6d-18fc-4e2b-841f-292a4c0ff232';

    console.log('[火山引擎] 开始视频生成流程');
    console.log('[火山引擎] 视频时长:', duration, '秒');
    console.log('[火山引擎] 提示词:', combinedPrompt);

    // 调用火山引擎 API
    const response = await fetch(VOLCENGINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'doubao-seedance-1-5-pro-251215',
        content: [
          {
            type: 'text',
            text: combinedPrompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: startFrameUrl,
            },
            role: 'first_frame',
          },
          {
            type: 'image_url',
            image_url: {
              url: endFrameUrl,
            },
            role: 'last_frame',
          },
        ],
        generate_audio: true,
        draft: true,
        duration: duration,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('火山引擎 API 错误:', errorText);
      return NextResponse.json(
        { error: '视频生成请求失败', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      taskId: data.id,
    });
  } catch (error) {
    console.error('火山引擎视频生成错误:', error);
    return NextResponse.json(
      { error: '火山引擎视频生成服务异常' },
      { status: 500 }
    );
  }
}
