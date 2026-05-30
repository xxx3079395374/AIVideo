/**
 * AI服务接口预留
 * 用于与AI大模型进行交互
 */

import type { AIRequest, AIResponse, ScriptScene, StoryboardImage, VideoTask, Character, Scene } from '@/types';

// AI服务配置
const AI_CONFIG = {
  // 这里预留AI API端点
  baseUrl: process.env.NEXT_PUBLIC_AI_API_URL || '/api/ai',
  // 模型配置
  model: process.env.NEXT_PUBLIC_AI_MODEL || 'default',
  // 超时时间
  timeout: 60000,
};

/**
 * 通用AI请求方法（流式响应）
 * @param request AI请求参数
 * @param onStream 流式回调
 */
export async function streamAIRequest<T>(
  request: AIRequest,
  onStream?: (chunk: string) => void
): Promise<AIResponse<T>> {
  try {
    const response = await fetch(`${AI_CONFIG.baseUrl}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        model: AI_CONFIG.model,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI请求失败: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }

    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      result += chunk;
      onStream?.(chunk);
    }

    return {
      success: true,
      data: JSON.parse(result) as T,
    };
  } catch (error) {
    console.error('AI请求错误:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 通用AI请求方法（非流式）
 * @param request AI请求参数
 */
export async function aiRequest<T>(request: AIRequest): Promise<AIResponse<T>> {
  try {
    const response = await fetch(`${AI_CONFIG.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        model: AI_CONFIG.model,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI请求失败: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    console.error('AI请求错误:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 生成剧本
 * @param originalText 原始文案
 * @param onStream 流式回调
 */
export async function generateScript(
  originalText: string,
  onStream?: (chunk: string) => void
): Promise<AIResponse<ScriptScene[]>> {
  return streamAIRequest<ScriptScene[]>(
    {
      prompt: originalText,
      type: 'script',
    },
    onStream
  );
}

/**
 * 生成分镜
 * @param script 剧本内容
 * @param onStream 流式回调
 */
export async function generateStoryboardImages(
  script: ScriptScene[],
  onStream?: (chunk: string) => void
): Promise<AIResponse<StoryboardImage[]>> {
  return streamAIRequest<StoryboardImage[]>(
    {
      prompt: JSON.stringify(script),
      type: 'storyboard',
    },
    onStream
  );
}

/**
 * 生成分镜图片
 * @param prompt 图片描述
 */
export async function generateStoryboardImage(
  prompt: string
): Promise<AIResponse<string>> {
  return aiRequest<string>({
    prompt,
    type: 'image',
  });
}

/**
 * 生成视频
 * @param startFrameId 首帧ID
 * @param endFrameId 尾帧ID
 */
export async function generateVideo(
  startFrameId: string,
  endFrameId: string
): Promise<AIResponse<string>> {
  return aiRequest<string>({
    prompt: JSON.stringify({ startFrameId, endFrameId }),
    type: 'video',
  });
}

/**
 * AI选角
 * @param script 剧本内容
 */
export async function aiSelectCharacters(
  script: ScriptScene[]
): Promise<AIResponse<Character[]>> {
  return aiRequest<Character[]>({
    prompt: JSON.stringify(script),
    type: 'character',
  });
}

/**
 * AI场布
 * @param script 剧本内容
 */
export async function aiArrangeScenes(
  script: ScriptScene[]
): Promise<AIResponse<Scene[]>> {
  return aiRequest<Scene[]>({
    prompt: JSON.stringify(script),
    type: 'scene',
  });
}

/**
 * AI重写脚本
 * @param currentScript 当前脚本
 * @param instruction 重写指令
 */
export async function aiRewriteScript(
  currentScript: string,
  instruction: string
): Promise<AIResponse<string>> {
  return aiRequest<string>({
    prompt: `${instruction}\n\n原始脚本:\n${currentScript}`,
    type: 'script',
  });
}

// 模拟数据（开发阶段使用）
export const mockScriptScenes: ScriptScene[] = [
  { 
    id: '1', 
    sceneNumber: 1, 
    sceneCode: '1-1',
    title: '火箭就位', 
    location: '山谷中央发射台', 
    summary: '火箭就位',
    sceneLocation: '外 山谷中央发射台',
    time: '',
    weather: '晴',
    characters: '',
    description: '运载火箭矗立在发射台上，周围是一片宁静的山谷...\n画面: 火箭静静地矗立在发射台上, 发射台位于山谷中央\n特写: 火箭尾部喷口的细节, 金属光泽闪烁\n氛围: 宁静、蓄势待发',
  },
  { 
    id: '2', 
    sceneNumber: 1, 
    sceneCode: '1-2',
    title: '点火启动', 
    location: '山谷中央发射台', 
    summary: '点火启动',
    sceneLocation: '外 山谷中央发射台',
    time: '',
    weather: '晴',
    characters: '',
    description: '点火倒计时，火箭底部喷射出火焰...\n画面: 火箭底部喷射出巨大火焰, 烟尘四起\n特写: 火焰从喷口涌出的瞬间\n氛围: 紧张、震撼',
  },
  { 
    id: '3', 
    sceneNumber: 1, 
    sceneCode: '1-3',
    title: '火焰增大', 
    location: '山谷中央发射台', 
    summary: '火焰增大',
    sceneLocation: '外 山谷中央发射台',
    time: '',
    weather: '晴',
    characters: '',
    description: '火焰持续增大，火箭开始震动...\n画面: 火焰越来越猛烈, 推力逐渐增强\n特写: 火焰的颜色变化, 从橙红到蓝白\n氛围: 紧张、期待',
  },
  { 
    id: '4', 
    sceneNumber: 1, 
    sceneCode: '1-4',
    title: '缓缓升起', 
    location: '山谷中央发射台', 
    summary: '缓缓升起',
    sceneLocation: '外 山谷中央发射台',
    time: '',
    weather: '晴',
    characters: '',
    description: '火箭在推力作用下缓缓离开发射台...\n画面: 火箭缓缓脱离发射台, 向上升起\n特写: 发射台与火箭分离的瞬间\n氛围: 震撼、激动',
  },
  { 
    id: '5', 
    sceneNumber: 2, 
    sceneCode: '2-1',
    title: '穿越云层', 
    location: '云层', 
    summary: '穿越云层',
    sceneLocation: '外 云层',
    time: '',
    weather: '晴',
    characters: '',
    description: '火箭穿越厚厚的云层，白茫茫一片...\n画面: 火箭穿过白云, 周围白茫茫一片\n特写: 云层从火箭身边快速掠过\n氛围: 梦幻、速度感',
  },
  { 
    id: '6', 
    sceneNumber: 2, 
    sceneCode: '2-2',
    title: '高空飞行', 
    location: '高空', 
    summary: '高空飞行',
    sceneLocation: '外 高空',
    time: '',
    weather: '晴',
    characters: '',
    description: '火箭在高空中疾速飞行，地球弧线逐渐显现...\n画面: 火箭在高空疾速飞行, 地球弧线显现\n特写: 天空从蓝色渐变为深蓝\n氛围: 壮阔、震撼',
  },
  { 
    id: '7', 
    sceneNumber: 3, 
    sceneCode: '3-1',
    title: '进入太空', 
    location: '太空', 
    summary: '进入太空',
    sceneLocation: '外 太空',
    time: '',
    weather: '',
    characters: '',
    description: '火箭冲出大气层，进入浩瀚的太空...\n画面: 火箭冲出大气层, 进入黑暗的太空\n特写: 星辰在周围闪烁\n氛围: 神秘、壮丽',
  },
  { 
    id: '8', 
    sceneNumber: 3, 
    sceneCode: '3-2',
    title: '星河漫游', 
    location: '太空', 
    summary: '星河漫游',
    sceneLocation: '外 太空',
    time: '',
    weather: '',
    characters: '',
    description: '在星河中穿行，星辰闪烁...\n画面: 火箭在星河中穿行, 星辰璀璨\n特写: 星星的特写, 闪烁的光芒\n氛围: 神秘、梦幻',
  },
  { 
    id: '9', 
    sceneNumber: 3, 
    sceneCode: '3-3',
    title: '地球回望', 
    location: '太空', 
    summary: '地球回望',
    sceneLocation: '外 太空',
    time: '',
    weather: '',
    characters: '',
    description: '回望地球，蔚蓝的星球在黑暗中闪耀...\n画面: 回望地球, 蔚蓝色星球在黑暗中闪耀\n特写: 地球的云层和海洋\n氛围: 感动、壮丽',
  },
  { 
    id: '10', 
    sceneNumber: 3, 
    sceneCode: '3-4',
    title: '尾声', 
    location: '太空', 
    summary: '尾声',
    sceneLocation: '外 太空',
    time: '',
    weather: '',
    characters: '',
    description: '镜头拉远，火箭成为星海中的一颗亮点...\n画面: 镜头拉远, 火箭成为星海中的亮点\n特写: 星空的全景\n氛围: 悠远、诗意',
  },
];

export const mockStoryboardImages: StoryboardImage[] = [
  { id: '1', sceneNumber: 1, sceneCode: '1-1', title: '火箭就位', prompt: '火箭静静地矗立在发射台上, 发射台位于山谷中央, 晨曦初露', status: 'pending' },
  { id: '2', sceneNumber: 1, sceneCode: '1-2', title: '点火启动', prompt: '火箭底部喷射出巨大火焰, 烟尘四起, 火焰从喷口涌出', status: 'pending' },
  { id: '3', sceneNumber: 1, sceneCode: '1-3', title: '火焰增大', prompt: '火焰越来越猛烈, 推力逐渐增强, 火焰颜色从橙红到蓝白', status: 'pending' },
  { id: '4', sceneNumber: 1, sceneCode: '1-4', title: '缓缓升起', prompt: '火箭缓缓脱离发射台, 向上升起, 震撼的升空瞬间', status: 'pending' },
  { id: '5', sceneNumber: 2, sceneCode: '2-1', title: '穿越云层', prompt: '火箭穿过白云, 周围白茫茫一片, 云层快速掠过', status: 'pending' },
  { id: '6', sceneNumber: 2, sceneCode: '2-2', title: '高空飞行', prompt: '火箭在高空疾速飞行, 地球弧线显现, 天空渐变深蓝', status: 'pending' },
  { id: '7', sceneNumber: 3, sceneCode: '3-1', title: '进入太空', prompt: '火箭冲出大气层, 进入黑暗太空, 星辰闪烁', status: 'pending' },
  { id: '8', sceneNumber: 3, sceneCode: '3-2', title: '星河漫游', prompt: '火箭在星河中穿行, 星辰璀璨, 神秘梦幻', status: 'pending' },
  { id: '9', sceneNumber: 3, sceneCode: '3-3', title: '地球回望', prompt: '回望地球, 蔚蓝色星球在黑暗中闪耀, 壮丽动人', status: 'pending' },
  { id: '10', sceneNumber: 3, sceneCode: '3-4', title: '尾声', prompt: '镜头拉远, 火箭成为星海中的亮点, 悠远诗意', status: 'pending' },
];

export const mockCharacters: Character[] = [
  { id: '1', name: '运载火箭', type: 'extra', usageCount: 10, description: '主角载具' },
  { id: '2', name: '旁白', type: 'extra', usageCount: 8, description: '解说员' },
  { id: '3', name: '指挥官', type: 'extra', usageCount: 3, description: '发射指挥' },
  { id: '4', name: '宇航员', type: 'extra', usageCount: 2, description: '乘客' },
];

export const mockScenes: Scene[] = [
  { id: '1', name: '山谷中央发射台/外', type: 'secondary', usageCount: 4, status: 'completed' },
  { id: '2', name: '空中/外', type: 'secondary', usageCount: 3, status: 'completed' },
  { id: '3', name: '云层/外', type: 'secondary', usageCount: 2, status: 'completed' },
  { id: '4', name: '高空/外', type: 'secondary', usageCount: 2, status: 'completed' },
  { id: '5', name: '高空/近太空/外', type: 'secondary', usageCount: 1, status: 'completed' },
  { id: '6', name: '太空/外', type: 'secondary', usageCount: 4, status: 'completed' },
  { id: '7', name: '控制中心/内', type: 'secondary', usageCount: 2, status: 'completed' },
];
