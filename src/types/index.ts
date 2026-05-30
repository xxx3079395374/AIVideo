// 创作流程步骤
export type CreationStep = 'start' | 'role' | 'script' | 'scene' | 'character' | 'storyboard' | 'video' | 'result';

// 岗位分配
export interface RoleAssignment {
  director: string;      // 导演
  screenwriter: string;  // 编剧
  sceneDesign: string;   // 场景设计
  characterDesign: string; // 角色设计
  storyboard: string;    // 分镜
  editing: string;       // 剪辑
}

// 岗位配置
export interface RoleConfig {
  key: keyof RoleAssignment;
  label: string;
  icon: string;
  description: string;
  relatedStep: CreationStep;
}

// 步骤配置
export interface StepConfig {
  key: CreationStep;
  label: string;
  path: string;
}

// 剧本场次
export interface ScriptScene {
  id: string;
  sceneNumber: number;
  sceneCode: string; // 如 "1-1", "1-2"
  title: string;
  location: string;
  duration?: string;
  // 详细表单字段
  summary?: string; // 简介
  sceneLocation?: string; // 场景
  time?: string; // 时间
  weather?: string; // 天气
  characters?: string; // 人物
  description?: string; // 完整描述（包含场景内容 + 镜头描述）
}

// 分镜图片
export interface StoryboardImage {
  id: string;
  sceneNumber: number;
  sceneCode: string;
  title: string;
  imageUrl?: string;
  prompt: string; // 生成图片的提示词
  status: 'pending' | 'generating' | 'completed' | 'failed';
  // 关联数据
  linkedSceneId?: string; // 关联的场景ID（与 referencedStoryboardId 互斥）
  linkedCharacterIds?: string[]; // 关联的角色ID数组
  referencedStoryboardId?: string; // 参考的分镜图ID（与 linkedSceneId 互斥）
}

// 视频生成任务
export interface VideoTask {
  id: string;
  name: string;
  startFrameId: string; // 首帧分镜ID
  endFrameId: string; // 尾帧分镜ID
  startFrameUrl?: string;
  endFrameUrl?: string;
  startFramePrompt?: string; // 首帧提示词
  endFramePrompt?: string; // 尾帧提示词
  taskId?: string; // 火山引擎任务ID
  videoUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  duration: 5 | 10 | 15; // 视频时长（秒）
}

// 视频时长选项
export const VIDEO_DURATIONS = [5, 10, 15] as const;
export type VideoDuration = 5 | 10 | 15;

// 角色
export interface Character {
  id: string;
  name: string;
  type: 'protagonist' | 'supporting' | 'extra';
  usageCount: number;
  description?: string;
  avatar?: string;
  imageData?: string; // 绘制的角色图片
  status?: 'pending' | 'polishing' | 'completed' | 'failed' | 'rejected'; // 润色状态
}

// 场景
export interface Scene {
  id: string;
  name: string;
  type: 'main' | 'secondary';
  usageCount: number;
  description?: string;
  icon?: string;
  imageData?: string; // 绘制的场景图片（涂鸦或润色后）
  status: 'pending' | 'polishing' | 'completed' | 'failed' | 'rejected'; // 润色状态
}

// AI请求类型
export interface AIRequest {
  prompt: string;
  context?: string;
  type: 'script' | 'storyboard' | 'character' | 'scene' | 'image' | 'video';
}

// AI响应类型
export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 创作状态
export interface CreationState {
  currentStep: CreationStep;
  originalText: string;
  style: ImageStyle; // 选中的图片风格
  roleAssignment?: RoleAssignment; // 岗位分配
  generatedScript: ScriptScene[];
  storyboardImages: StoryboardImage[];
  videoTasks: VideoTask[];
  characters: Character[];
  scenes: Scene[];
  selectedStoryboard?: string;
  // 视频生成方式
  videoGenerationMethod: VideoGenerationMethod;
  // 视频成品缓存
  concatenatedVideoUrl?: string; // 已拼接的视频成品 URL
  concatenatedVideoCount?: number; // 拼接时的视频数量（用于检测变化）
  // 拼接状态
  isConcatenating?: boolean; // 是否正在拼接中
}

// 图片风格类型
export type ImageStyle = 
  | '3d-cartoon'
  | 'anime'
  | 'oil-painting'
  | 'watercolor'
  | 'sketch'
  | 'chinese-painting'
  | 'flat-illustration';

// 视频生成方式
export type VideoGenerationMethod = 'comfyui' | 'huoshan';

// 风格配置
export interface StyleConfig {
  key: ImageStyle;
  label: string;
  prompt: string; // 传递给 AI 的提示词
  icon: string; // 风格图标
}

// 风格配置列表
export const STYLE_CONFIGS: StyleConfig[] = [
  { key: '3d-cartoon', label: '3D卡通', prompt: '<3d cartoon>', icon: '🎨' },
  { key: 'anime', label: '二次元', prompt: '<anime>', icon: '✨' },
  { key: 'oil-painting', label: '油画', prompt: '<oil painting>', icon: '🖼️' },
  { key: 'watercolor', label: '水彩', prompt: '<watercolor>', icon: '💧' },
  { key: 'sketch', label: '素描', prompt: '<sketch>', icon: '✏️' },
  { key: 'chinese-painting', label: '中国画', prompt: '<chinese painting>', icon: '🖌️' },
  { key: 'flat-illustration', label: '扁平插画', prompt: '<flat illustration>', icon: '🎯' },
];

// 根据风格 key 获取配置
export const getStyleConfig = (key: ImageStyle): StyleConfig => {
  return STYLE_CONFIGS.find(s => s.key === key) || STYLE_CONFIGS[0];
};
