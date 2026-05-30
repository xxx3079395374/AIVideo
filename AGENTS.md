# 项目开发文档

## 项目概览

这是一个视频创作自动化平台，帮助用户从创意文案到视频成品的全流程自动化创作。用户输入创意文案后，系统会自动生成剧本、场景、角色、分镜和视频。

### 核心功能模块

1. **创作启动 (Start)** - 岗位分配和创意输入
2. **剧本生成 (Script)** - 根据创意生成分镜剧本
3. **场景绘制 (Scene)** - 绘制并润色场景图
4. **角色绘制 (Character)** - 绘制并润色角色图
5. **分镜生成 (Storyboard)** - 生成分镜图片
6. **视频生成 (Video)** - 生成视频片段并拼接
7. **结果展示 (Result)** - 展示最终视频作品

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **状态管理**: React Context API

## 构建和测试命令

```bash
# 安装依赖
pnpm install

# 开发环境（带热更新）
coze dev

# 构建生产版本
coze build

# 启动生产环境
coze start

# 类型检查
npx tsc --noEmit
```

## 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── start/             # 创作启动页面
│   ├── script/            # 剧本生成页面
│   ├── scene/             # 场景绘制页面
│   ├── character/         # 角色绘制页面
│   ├── storyboard/        # 分镜生成页面
│   ├── video/             # 视频生成页面
│   └── result/            # 结果展示页面
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 组件
│   ├── role-header.tsx   # 步骤导航组件
│   ├── scene-task-list.tsx   # 场景任务列表
│   └── character-task-list.tsx # 角色任务列表
├── lib/                  # 工具库
│   ├── store.tsx         # 全局状态管理
│   └── utils.ts          # 工具函数
└── types/                # TypeScript 类型定义
    └── index.ts
```

## 核心数据流

### 1. 剧本数据 (ScriptScene)

```typescript
interface ScriptScene {
  id: string;
  sceneNumber: number;
  sceneCode: string;        // 如 "1-1", "1-2"
  title: string;
  location: string;
  duration?: string;
  // 详细表单字段
  summary?: string;         // 简介
  sceneLocation?: string;   // 场景（用于场景提取）
  time?: string;            // 时间（用于场景显示）
  weather?: string;         // 天气（用于场景显示）
  characters?: string;      // 人物（用于角色提取，格式："角色1、角色2"）
  description?: string;     // 完整描述
}
```

### 2. 场景数据 (Scene)

```typescript
interface Scene {
  id: string;
  name: string;             // 场景名称，格式："场景名称（时间，天气）"
  type: 'main' | 'secondary';
  usageCount: number;
  description?: string;
  imageData?: string;       // 绘制的场景图片（涂鸦或润色后）
  status: 'pending' | 'polishing' | 'completed' | 'failed';
}
```

### 3. 角色数据 (Character)

```typescript
interface Character {
  id: string;
  name: string;             // 角色名称
  type: 'protagonist' | 'supporting' | 'extra';
  usageCount: number;
  description?: string;
  imageData?: string;       // 绘制的角色图片（涂鸦或润色后）
  status?: 'pending' | 'polishing' | 'completed' | 'failed';
}
```

## 关键功能实现

### 风格选择功能

在"创作启动"页面，用户可以选择视频生成所使用的图片风格。

位置：`src/app/start/page.tsx`

**风格选项**：

| 中文名 | style 参数 | 提示词 |
|--------|-----------|--------|
| 3D卡通 | `3d-cartoon` | `<3d cartoon>` |
| 二次元 | `anime` | `<anime>` |
| 油画 | `oil-painting` | `<oil painting>` |
| 水彩 | `watercolor` | `<watercolor>` |
| 素描 | `sketch` | `<sketch>` |
| 中国画 | `chinese-painting` | `<chinese painting>` |
| 扁平插画 | `flat-illustration` | `<flat illustration>` |

**类型定义**：

```typescript
// 图片风格类型
export type ImageStyle = 
  | '3d-cartoon'
  | 'anime'
  | 'oil-painting'
  | 'watercolor'
  | 'sketch'
  | 'chinese-painting'
  | 'flat-illustration';

// 风格配置列表
export const STYLE_CONFIGS: StyleConfig[] = [
  { key: '3d-cartoon', label: '3D卡通', prompt: '<3d cartoon>', icon: '🎨' },
  // ... 其他风格
];
```

**数据流**：
1. 用户在创作启动页面选择风格
2. 风格参数保存到全局状态 (`store.tsx` 的 `style` 字段)
3. 场景/角色润色时，从 store 获取 style 并传递给 `/api/polish-scene`
4. 分镜生成时，从 store 获取 style 并传递给 `/api/generate-storyboard`

**API 集成**：
- `/api/polish-scene`：接收 `style` 参数，映射为阿里云风格值
- `/api/generate-storyboard`：接收 `style` 参数，追加到提示词中

### 场景提取逻辑

位置：`src/app/scene/page.tsx`

```typescript
const extractUniqueScenes = (scriptScenes: ScriptScene[]) => {
  const sceneMap = new Map<string, ScriptScene>();
  
  scriptScenes.forEach(scene => {
    if (scene.sceneLocation) {
      // 根据 sceneLocation 去重，保留第一个
      if (!sceneMap.has(scene.sceneLocation)) {
        sceneMap.set(scene.sceneLocation, scene);
      }
    }
  });
  
  return Array.from(sceneMap.values());
};
```

**显示格式**：`{sceneLocation}（{time}，{weather}）`

### 角色提取逻辑

位置：`src/components/character-task-list.tsx`

```typescript
const extractUniqueCharacters = (scenes: ScriptScene[]) => {
  const characterSet = new Set<string>();
  const uniqueCharacters: { name: string; sourceScene: ScriptScene }[] = [];
  
  scenes.forEach(scene => {
    if (scene.characters) {
      // 拆分"火箭、发射人员" → ['火箭', '发射人员']
      const chars = scene.characters.split('、').map(c => c.trim()).filter(Boolean);
      
      chars.forEach(charName => {
        if (!characterSet.has(charName)) {
          characterSet.add(charName);
          uniqueCharacters.push({
            name: charName,
            sourceScene: scene
          });
        }
      });
    }
  });
  
  return uniqueCharacters;
};
```

**显示格式**：只显示角色名称（如"火箭"、"发射人员"）

**字段说明**：
- `characters` 字段格式：使用"、"分隔多个角色
- 如果某个分镜的 `characters` 为空，跳过即可
- 根据角色名称去重

### 状态管理

位置：`src/lib/store.tsx`

使用 React Context API 实现全局状态管理，包括：
- `currentStep` - 当前步骤
- `originalText` - 原始创意文案
- `generatedScript` - 生成的剧本数据
- `characters` - 角色列表
- `scenes` - 场景列表
- `storyboardImages` - 分镜图片
- `videoTasks` - 视频任务

### AI 润色接口

位置：`src/app/api/polish-scene/route.ts`

将用户绘制的涂鸦图片通过 AI 润色成专业图片。

**请求参数**：
- `image`: 图片文件 (FormData)
- `prompt`: 提示词
- `sceneName`: 场景/角色名称

**响应格式**：
```json
{
  "synthesizedImageUrl": "https://..."
}
```

### ComfyUI 视频生成接口

**配置信息**：
- **API 地址**：`https://sv-a367666e-b46e-409b-ace6-caabf1a46450-9001-x-defau-c1d8805f9f.sproxy.hd-01.alayanew.com:22443`
- **无需认证**
- **超时时间**：5 分钟

**工作流**：使用 LTX2.3 FLF2V (First-Last-Frame-to-Video) Workflow

位置：`src/app/api/generate-video/route.ts`

**功能流程**：
1. 下载首帧和尾帧图片
2. 上传到 ComfyUI `/upload/image` 接口
3. 构建并提交 LTX2.3 Workflow 到 `/prompt` 接口
4. 返回 `prompt_id` 用于后续状态查询

**请求参数**：
```typescript
{
  startFrameUrl: string;      // 首帧图片 URL
  endFrameUrl: string;        // 尾帧图片 URL
  startFramePrompt: string;    // 首帧提示词
  endFramePrompt: string;      // 尾帧提示词
}
```

**响应格式**：
```json
{
  "success": true,
  "taskId": "prompt_id",      // ComfyUI prompt_id
  "message": "视频生成任务已提交到 ComfyUI"
}
```

### ComfyUI 视频状态查询接口

位置：`src/app/api/video-status/[taskId]/route.ts`

**查询接口**：`/api/history/{prompt_id}`

**ComfyUI API 响应格式**：
```json
{
  "prompt_id": {
    "status": {
      "status_str": "success",  // success, failed, executing
      "completed": true,
      "error": "..."
    },
    "outputs": {
      "68": {
        "images": [{
          "filename": "video/ltx2.3_flf2v_00001_.mp4",
          "subfolder": "video",
          "type": "output"
        }],
        "animated": [true]
      }
    }
  }
}
```

**响应格式**：
```json
{
  "status": "completed",      // queued, processing, completed, failed, timeout
  "videoUrl": "https://sv-220cb743-.../view?filename=video/xxx.mp4&...",
  "message": "视频生成完成"
}
```

### ComfyUI Workflow 模板

位置：`src/lib/ltx_workflow_template.json`

**关键节点**：
- **节点 31**: LoadImage (首帧)
- **节点 39**: LoadImage (尾帧)
- **节点 68**: SaveVideo (保存视频)
- **节点 129:128**: CLIPTextEncode (正向提示词)
- **节点 129:100**: RandomNoise (随机噪波种子)

**提示词组合逻辑**：
```
正向提示词 = 首帧提示词 + "。" + 尾帧提示词
```

## 代码风格指南

### 1. 组件命名

- 页面组件：PascalCase（如 `CharacterPage`）
- 工具组件：PascalCase（如 `SceneTaskList`）
- shadcn/ui 组件：小写 + 连字符（如 `button.tsx`）

### 2. TypeScript 规范

- 所有组件和函数必须有明确的类型定义
- 使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型

### 3. 样式规范

- 使用 Tailwind CSS 工具类
- 复杂样式使用 `cn()` 工具函数合并
- 优先使用 shadcn/ui 组件

### 4. 错误处理

- API 调用必须包含 try-catch
- 用户可见的错误信息要友好清晰
- 失败状态要明确标识（如 `status: 'failed'`）

## 测试说明

### 类型检查

在提交代码前，必须运行类型检查：

```bash
npx tsc --noEmit
```

### 功能测试

1. **剧本生成测试**
   - 输入创意文案
   - 检查生成的剧本格式是否正确
   - 检查 `characters` 字段格式是否正确

2. **场景提取测试**
   - 检查场景是否根据 `sceneLocation` 正确去重
   - 检查场景显示格式是否正确

3. **角色提取测试**
   - 检查角色是否根据 `characters` 字段正确拆分
   - 检查角色是否正确去重
   - 检查显示格式是否只显示角色名称

4. **画板功能测试**
   - 测试绘制、清空功能
   - 测试颜色和画笔大小切换
   - 测试触摸屏兼容性

5. **AI 润色测试**
   - 测试图片提交功能
   - 测试润色状态显示
   - 测试重试功能

6. **视频生成测试 (ComfyUI)**
   - 测试首帧/尾帧图片上传
   - 测试 Workflow 提交
   - 测试任务状态轮询
   - 测试视频 URL 解析和播放
   - 测试 5 分钟超时处理

## 安全注意事项

1. **环境变量**
   - 使用 `process.env.COZE_PROJECT_DOMAIN_DEFAULT` 获取访问域名
   - 使用 `process.env.DEPLOY_RUN_PORT` 获取服务端口
   - 禁止硬编码敏感信息

2. **数据验证**
   - 用户输入必须进行验证和清理
   - 文件上传必须检查类型和大小
   - API 响应必须进行错误处理

3. **XSS 防护**
   - 所有用户输入显示前必须转义
   - 使用 dangerouslySetInnerHTML 必须谨慎

## 常见问题

### 1. 角色提取不显示

**检查点**：
- 剧本数据中是否包含 `characters` 字段
- `characters` 字段格式是否正确（使用"、"分隔）
- 是否调用了 `extractUniqueCharacters` 函数

### 2. AI 润色失败

**检查点**：
- API 路由是否正确配置
- FormData 是否正确构建
- 网络连接是否正常
- 查看日志获取详细错误信息

### 3. 热更新不生效

**检查点**：
- 确认使用 `coze dev` 启动服务
- 检查浏览器是否禁用了缓存
- 查看控制台是否有错误

### 4. 类型错误

**检查点**：
- 运行 `npx tsc --noEmit` 查看具体错误
- 检查类型定义是否完整
- 检查导入路径是否正确

## 性能优化建议

1. **列表渲染优化**
   - 使用虚拟滚动处理长列表
   - 避免在 map 中定义函数

2. **图片优化**
   - 使用 Next.js Image 组件
   - 启用图片懒加载

3. **状态管理优化**
   - 避免不必要的状态更新
   - 使用 useMemo 和 useCallback 缓存

4. **代码分割**
   - 使用动态导入分割大组件
   - 按路由分割代码
