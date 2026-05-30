import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// ComfyUI API 配置
const COMFYUI_API_URL = 'https://sv-a367666e-b46e-409b-ace6-caabf1a46450-9001-x-defau-c1d8805f9f.sproxy.hd-01.alayanew.com:22443';

interface GenerateVideoRequest {
  startFrameUrl: string;
  endFrameUrl: string;
  startFramePrompt: string;
  endFramePrompt: string;
  duration?: number; // 视频时长（秒），可选值：5, 10, 15
}

// 加载工作流模板
function loadWorkflowTemplate(): any {
  const templatePath = path.join(process.cwd(), 'src/lib/ltx_workflow_template.json');
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  return JSON.parse(templateContent);
}

// 构建 LTX2.3 FLF2V Workflow
function buildLTXWorkflow(
  firstFrameFilename: string,
  lastFrameFilename: string,
  positivePrompt: string,
  duration: number = 5
) {
  // 加载模板
  const workflow = loadWorkflowTemplate();
  
  // 替换首帧图片
  if (workflow['31'] && workflow['31'].inputs) {
    workflow['31'].inputs.image = firstFrameFilename;
  }
  
  // 替换尾帧图片
  if (workflow['39'] && workflow['39'].inputs) {
    workflow['39'].inputs.image = lastFrameFilename;
  }
  
  // 替换正向提示词
  if (workflow['129:128'] && workflow['129:128'].inputs) {
    workflow['129:128'].inputs.text = positivePrompt;
  }
  
  // 替换视频时长（Duration）- 节点 129:102
  if (workflow['129:102'] && workflow['129:102'].inputs) {
    workflow['129:102'].inputs.value = duration;
  }
  
  // 随机生成噪波种子
  if (workflow['129:100'] && workflow['129:100'].inputs) {
    workflow['129:100'].inputs.noise_seed = Math.floor(Math.random() * 1000000000000000);
  }
  
  return workflow;
}

// 将 base64 转换为 FormData (模拟浏览器环境，使用 Blob)
function base64ToFormData(base64Data: string, filename: string): FormData {
  // 移除 data URL 前缀（如果有）
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
  
  // 将 base64 转换为二进制 Buffer
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // 创建 Blob
  const blob = new Blob([bytes], { type: 'image/png' });
  
  // 创建 FormData
  const formData = new FormData();
  formData.append('image', blob, filename);
  
  return formData;
}

// 将 Buffer 转换为 FormData (Node.js 环境)
function bufferToFormData(buffer: Buffer, filename: string): FormData {
  const { Readable } = require('stream');
  
  // 创建 Readable stream
  const stream = Readable.from(buffer);
  
  // 创建 FormData
  const formData = new FormData();
  formData.append('image', stream, filename);
  
  return formData;
}

export async function POST(request: NextRequest) {
  let firstFrameFilename: string | null = null;
  let lastFrameFilename: string | null = null;

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

    console.log('[ComfyUI] 开始视频生成流程');
    console.log('[ComfyUI] 首帧 URL:', startFrameUrl);
    console.log('[ComfyUI] 尾帧 URL:', endFrameUrl);
    console.log('[ComfyUI] 视频时长:', duration, '秒');
    console.log('[ComfyUI] 提示词:', combinedPrompt);

    // Step 1: 下载首帧图片
    console.log('[ComfyUI] Step 1: 下载首帧图片...');
    const firstFrameResponse = await fetch(startFrameUrl);
    if (!firstFrameResponse.ok) {
      throw new Error(`下载首帧图片失败: ${firstFrameResponse.status}`);
    }
    const firstFrameBuffer = Buffer.from(await firstFrameResponse.arrayBuffer());
    firstFrameFilename = `first_frame_${Date.now()}.png`;

    // Step 2: 上传首帧图片到 ComfyUI
    console.log('[ComfyUI] Step 2: 上传首帧图片到 ComfyUI...');
    const firstFormData = new FormData();
    firstFormData.append('image', new Blob([firstFrameBuffer]), firstFrameFilename);
    firstFormData.append('type', 'input');

    const firstFrameUploadResponse = await fetch(`${COMFYUI_API_URL}/upload/image`, {
      method: 'POST',
      body: firstFormData,
    });

    if (!firstFrameUploadResponse.ok) {
      const errorText = await firstFrameUploadResponse.text();
      console.error('[ComfyUI] 首帧图片上传失败:', errorText);
      throw new Error(`首帧图片上传失败: ${errorText}`);
    }

    const firstFrameUploadData = await firstFrameUploadResponse.json();
    console.log('[ComfyUI] 首帧上传成功:', firstFrameUploadData);
    
    // ComfyUI 返回的是 { name: "filename.png", type: "input", subfolder: "" }
    const firstFrameUploadedName = firstFrameUploadData.name || firstFrameFilename;

    // Step 3: 下载尾帧图片
    console.log('[ComfyUI] Step 3: 下载尾帧图片...');
    const lastFrameResponse = await fetch(endFrameUrl);
    if (!lastFrameResponse.ok) {
      throw new Error(`下载尾帧图片失败: ${lastFrameResponse.status}`);
    }
    const lastFrameBuffer = Buffer.from(await lastFrameResponse.arrayBuffer());
    lastFrameFilename = `last_frame_${Date.now()}.png`;

    // Step 4: 上传尾帧图片到 ComfyUI
    console.log('[ComfyUI] Step 4: 上传尾帧图片到 ComfyUI...');
    const lastFormData = new FormData();
    lastFormData.append('image', new Blob([lastFrameBuffer]), lastFrameFilename);
    lastFormData.append('type', 'input');

    const lastFrameUploadResponse = await fetch(`${COMFYUI_API_URL}/upload/image`, {
      method: 'POST',
      body: lastFormData,
    });

    if (!lastFrameUploadResponse.ok) {
      const errorText = await lastFrameUploadResponse.text();
      console.error('[ComfyUI] 尾帧图片上传失败:', errorText);
      throw new Error(`尾帧图片上传失败: ${errorText}`);
    }

    const lastFrameUploadData = await lastFrameUploadResponse.json();
    console.log('[ComfyUI] 尾帧上传成功:', lastFrameUploadData);
    const lastFrameUploadedName = lastFrameUploadData.name || lastFrameFilename;

    // Step 5: 构建并提交 Workflow
    console.log('[ComfyUI] Step 5: 构建并提交 Workflow...');
    const workflow = buildLTXWorkflow(firstFrameUploadedName, lastFrameUploadedName, combinedPrompt, duration);

    console.log('[ComfyUI] 提交的 Workflow 关键节点:', {
      '31': workflow['31']?.inputs,
      '39': workflow['39']?.inputs,
      '129:128': workflow['129:128']?.inputs,
    });

    // 生成 client_id
    const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const promptResponse = await fetch(`${COMFYUI_API_URL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        prompt: workflow,
      }),
    });

    if (!promptResponse.ok) {
      const errorText = await promptResponse.text();
      console.error('[ComfyUI] Workflow 提交失败:', errorText);
      throw new Error(`Workflow 提交失败: ${errorText}`);
    }

    const promptData = await promptResponse.json();
    console.log('[ComfyUI] Workflow 提交成功:', promptData);

    const promptId = promptData.prompt_id;
    if (!promptId) {
      throw new Error('未获取到 prompt_id');
    }

    // 返回 ComfyUI 的 prompt_id
    return NextResponse.json({
      success: true,
      taskId: promptId,
      message: '视频生成任务已提交到 ComfyUI',
    });

  } catch (error) {
    console.error('[ComfyUI] 视频生成错误:', error);
    
    // 清理已上传的图片（可选）
    // ...

    return NextResponse.json(
      { error: `视频生成服务异常: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
