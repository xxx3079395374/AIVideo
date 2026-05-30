import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COZE_UPLOAD_URL = 'https://api.coze.cn/v1/files/upload';
const COZE_KNOWLEDGE_URL = 'https://api.coze.cn/open_api/knowledge/document/create';
const COZE_IMAGE_CAPTION_BASE_URL = 'https://api.coze.cn/v1/datasets';
// 使用新的 Coze PAT token
const COZE_AUTH_TOKEN = 'Bearer pat_hFVZFBpqaEFZzQvyX0PK87sG6LgSejD0T1FDdmFTCI5SjDagXNYCPq0fsQIbUHkm';
const DATASET_ID = '7618871927570956329';

// 阿里云 DashScope 配置
const DASHSCOPE_IMAGE_SYNTHESIS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis';
const DASHSCOPE_TASK_URL = 'https://dashscope.aliyuncs.com/api/v1/tasks';
const DASHSCOPE_AUTH_TOKEN = 'Bearer sk-bb8f1531b94a4c0fb9288aa0ca3dc436';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');
    const sceneName = formData.get('sceneName') as string | null;
    // 从请求中获取风格参数，默认为 watercolor
    const styleParam = formData.get('style') as string | null;
    
    // 风格映射：将前端风格 key 转换为阿里云风格值
    const styleMap: Record<string, string> = {
      '3d-cartoon': '<3d cartoon>',
      'anime': '<anime>',
      'oil-painting': '<oil painting>',
      'watercolor': '<watercolor>',
      'sketch': '<sketch>',
      'chinese-painting': '<chinese painting>',
      'flat-illustration': '<flat illustration>',
    };
    const styleValue = styleParam ? (styleMap[styleParam] || '<watercolor>') : '<watercolor>';

    if (!image) {
      return new Response(JSON.stringify({ error: '请上传图片' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 清理文件名：移除特殊字符，只保留中文、英文、数字、下划线和连字符
    const sanitizeFileName = (name: string): string => {
      return name
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // 移除非法字符
        .replace(/\s+/g, '_') // 空格替换为下划线
        .slice(0, 100) || 'scene'; // 限制长度，默认名称
    };

    const fileName = sceneName ? sanitizeFileName(sceneName) : 'doodle';

    let fileToUpload: File;

    // 处理不同类型的输入
    if (image instanceof File) {
      // 已经是 File 对象，重新创建以使用新文件名
      const buffer = Buffer.from(await image.arrayBuffer());
      fileToUpload = new File([buffer], `${fileName}.png`, { type: 'image/png' });
    } else if (typeof image === 'string') {
      // 是 base64 字符串，转换为二进制 File
      let base64Data = image;
      
      // 移除 data:image/xxx;base64, 前缀
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      
      // base64 转 Buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 创建 File 对象，使用场景名称作为文件名
      fileToUpload = new File([buffer], `${fileName}.png`, { type: 'image/png' });
    } else {
      return new Response(JSON.stringify({ error: '图片格式不支持' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 构造上传 FormData
    const uploadFormData = new FormData();
    uploadFormData.append('file', fileToUpload, `${fileName}.png`);

    // 调用 Coze 文件上传接口
    const response = await fetch(COZE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': COZE_AUTH_TOKEN,
      },
      body: uploadFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coze upload API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `上传失败: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const uploadResult = await response.json();
    
    // 检查上传是否成功
    if (uploadResult.code !== 0 || !uploadResult.data?.id) {
      console.error('Coze upload API error:', uploadResult);
      return new Response(JSON.stringify({ error: '文件上传失败', detail: uploadResult }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { file_name, id: fileId } = uploadResult.data;

    // Step 2: 创建知识库文档
    const knowledgeBody = {
      dataset_id: DATASET_ID,
      document_bases: [
        {
          name: file_name,
          source_info: {
            document_source: 5,
            source_file_id: fileId,
          },
        },
      ],
      chunk_strategy: {
        chunk_type: 0,
        caption_type: 1,
      },
      format_type: 2,
    };

    const knowledgeResponse = await fetch(COZE_KNOWLEDGE_URL, {
      method: 'POST',
      headers: {
        'Authorization': COZE_AUTH_TOKEN,
        'Content-Type': 'application/json',
        'Agw-Js-Conv': 'str',
      },
      body: JSON.stringify(knowledgeBody),
    });

    if (!knowledgeResponse.ok) {
      const errorText = await knowledgeResponse.text();
      console.error('Coze knowledge API error:', knowledgeResponse.status, errorText);
      return new Response(JSON.stringify({ error: `知识库文档创建失败: ${knowledgeResponse.status}` }), {
        status: knowledgeResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const knowledgeResult = await knowledgeResponse.json();
    
    // 检查知识库文档创建是否成功
    if (knowledgeResult.code !== 0 || !knowledgeResult.document_infos?.[0]?.document_id) {
      console.error('Coze knowledge API error:', knowledgeResult);
      return new Response(JSON.stringify({ error: '知识库文档创建失败', detail: knowledgeResult }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const documentId = knowledgeResult.document_infos[0].document_id;
    const documentName = knowledgeResult.document_infos[0].name;

    // Step 3: 设置图片标题（等待 15 秒后执行）
    await new Promise(resolve => setTimeout(resolve, 15000));

    const captionUrl = `${COZE_IMAGE_CAPTION_BASE_URL}/${DATASET_ID}/images/${documentId}`;
    const captionBody = {
      caption: documentName,
    };

    const captionResponse = await fetch(captionUrl, {
      method: 'PUT',
      headers: {
        'Authorization': COZE_AUTH_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(captionBody),
    });

    let captionResult = null;
    if (captionResponse.ok) {
      captionResult = await captionResponse.json();
    } else {
      const errorText = await captionResponse.text();
      console.error('Coze caption API error:', captionResponse.status, errorText);
      // 标题设置失败不影响主流程，仅记录错误
    }

    // Step 5: 查询图片列表获取润色后的 URL
    const imageUrl = `${COZE_IMAGE_CAPTION_BASE_URL}/${DATASET_ID}/images?keyword=${encodeURIComponent(file_name)}&has_caption=true`;

    const imageListResponse = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Authorization': COZE_AUTH_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    let polishedImageUrl = null;
    if (imageListResponse.ok) {
      const imageListResult = await imageListResponse.json();
      if (imageListResult.code === 0 && imageListResult.data?.photo_infos?.[0]?.url) {
        polishedImageUrl = imageListResult.data.photo_infos[0].url;
      }
    } else {
      const errorText = await imageListResponse.text();
      console.error('Coze image list API error:', imageListResponse.status, errorText);
    }

    // Step 6: 创建图像润色任务
    let synthesizedImageUrl = null;
    
    if (polishedImageUrl) {
      const synthesisBody = {
        model: 'wanx-sketch-to-image-lite',
        input: {
          sketch_image_url: polishedImageUrl,
          prompt: file_name,
        },
        parameters: {
          size: '768*768',
          n: 1,
          sketch_weight: 3,
          style: styleValue,
        },
      };

      const synthesisResponse = await fetch(DASHSCOPE_IMAGE_SYNTHESIS_URL, {
        method: 'POST',
        headers: {
          'X-DashScope-Async': 'enable',
          'Authorization': DASHSCOPE_AUTH_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(synthesisBody),
      });

      if (synthesisResponse.ok) {
        const synthesisResult = await synthesisResponse.json();

        // 检查响应中是否包含错误
        if (synthesisResult.code === 'DataInspectionFailed') {
          return new Response(JSON.stringify({
            error: '内容审核未通过，请调整画面或场景名称后重试',
            rejectReason: 'content_review',
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // 检查是否成功获取 task_id
        if (synthesisResult.output?.task_id) {
          const taskId = synthesisResult.output.task_id;

          // Step 7: 轮询查询任务结果
          const maxRetries = 60; // 最多查询 60 次
          const retryInterval = 3000; // 每次间隔 3 秒

          for (let i = 0; i < maxRetries; i++) {
            await new Promise(resolve => setTimeout(resolve, retryInterval));

            const taskResponse = await fetch(`${DASHSCOPE_TASK_URL}/${taskId}`, {
              method: 'GET',
              headers: {
                'Authorization': DASHSCOPE_AUTH_TOKEN,
              },
            });

            if (taskResponse.ok) {
              const taskResult = await taskResponse.json();
              const taskStatus = taskResult.output?.task_status;

              if (taskStatus === 'SUCCEEDED') {
                // 任务成功，提取润色后的图片 URL
                synthesizedImageUrl = taskResult.output?.results?.[0]?.url;
                break;
              } else if (taskStatus === 'FAILED') {
                // 任务失败，检查是否为内容审核拦截
                console.error('DashScope task failed:', taskResult.output?.message);
                if (taskResult.output?.code === 'DataInspectionFailed') {
                  return new Response(JSON.stringify({
                    error: '内容审核未通过，请调整画面或场景名称后重试',
                    rejectReason: 'content_review',
                  }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                  });
                }
                break;
              }
              // 其他状态（PENDING, RUNNING）继续轮询
            }
          }
        }
      } else {
        const errorText = await synthesisResponse.text();
        console.error('DashScope synthesis API error:', synthesisResponse.status, errorText);
        // 判断是否为内容审核拦截
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.code === 'DataInspectionFailed') {
            return new Response(JSON.stringify({
              error: '内容审核未通过，请调整画面或场景名称后重试',
              rejectReason: 'content_review',
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } catch {
          // 非 JSON 响应，忽略
        }
      }
    }
    
    return new Response(JSON.stringify({
      upload: uploadResult,
      knowledge: knowledgeResult,
      caption: captionResult,
      polishedImageUrl,
      synthesizedImageUrl,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload scene error:', error);
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
