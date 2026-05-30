import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOUBAO_IMAGE_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const DOUBAO_AUTH_TOKEN = 'Bearer 0e4f6f6d-18fc-4e2b-841f-292a4c0ff232';

// 风格映射：将前端风格 key 转换为提示词
const stylePrompts: Record<string, string> = {
  '3d-cartoon': ', <3d cartoon> style, high quality, detailed',
  'anime': ', <anime> style, high quality, detailed',
  'oil-painting': ', <oil painting> style, high quality, detailed',
  'watercolor': ', <watercolor> style, high quality, detailed',
  'sketch': ', <sketch> style, high quality, detailed',
  'chinese-painting': ', <chinese painting> style, high quality, detailed',
  'flat-illustration': ', <flat illustration> style, high quality, detailed',
};

/**
 * 提取可用的参考图片 URL：
 * - 当前模型 doubao-seedream-4-0-250828 只支持 HTTPS URL（不支持 base64）
 * - 仅返回第一张有效的 HTTPS URL
 */
function extractReferenceImage(images: unknown): string | null {
  if (!images || !Array.isArray(images) || images.length === 0) return null;
  for (const img of images) {
    if (typeof img === 'string' && img.startsWith('https://')) {
      return img;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, images, style } = body;

    if (!prompt) {
      return NextResponse.json({ error: '请输入提示词' }, { status: 400 });
    }

    const stylePrompt = style ? (stylePrompts[style] || '') : '';

    const requestBody: Record<string, unknown> = {
      model: 'doubao-seedream-4-0-250828',
      prompt: prompt + stylePrompt,
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: '2K',
      stream: false,
      watermark: false,
    };

    // 参考图片：当前模型仅支持单张，取第一张有效图片
    const referenceImage = extractReferenceImage(images);
    if (referenceImage) {
      requestBody.image = referenceImage;
    }

    const response = await fetch(DOUBAO_IMAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': DOUBAO_AUTH_TOKEN,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Doubao image API error:', response.status, errorText);
      return NextResponse.json(
        { error: `图片生成失败: ${response.status}`, detail: errorText.slice(0, 300) },
        { status: response.status }
      );
    }

    const result = await response.json();

    // 提取生成的图片 URL（兼容 b64_json 格式）
    const imageUrl = result.data?.[0]?.url || result.data?.[0]?.b64_json;

    if (!imageUrl) {
      console.error('Doubao response missing image URL:', JSON.stringify(result).slice(0, 500));
      return NextResponse.json({ error: '未获取到生成的图片' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Generate storyboard error:', error);
    return NextResponse.json(
      { error: '服务器内部错误', detail: String(error).slice(0, 300) },
      { status: 500 }
    );
  }
}
