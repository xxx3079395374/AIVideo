import { NextRequest } from 'next/server';

// Coze API 配置
const COZE_API_URL = 'https://6yskqwtxpk.coze.site/stream_run';
const COZE_API_KEY = process.env.COZE_API_KEY || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjA1OTk2NWM0LTcwMTYtNGNlNy1iYjVmLTE4MzMxZWU1YTA4MyJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIndyUDlKMzRzdlB0OUdKd0FDczdNVWNyVXROd0tPY2NrIl0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzc0MDg2MjA2LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjE5NjMzOTI4OTgyMjMzMTMwIiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NjE5NjQyMjM2NDEzNjczNTEzIn0.SV0XccvcCTE-QQB3jd20FWR6JvbuUd6eJzFZ0DVNF6dfWZWc-PKarlTTkbDUX6fkqfYQfXya3KrgmUX6nRHKrmTxm4UN_iW8jfSMQWnOa5oNcLeWfj3YLiKd-lKJgJ59yWxXkVNyIKdUsCc5zCACx09IGiGl9YWpwMekpNMIe7tBFhh85WTnXzflppCc-FWXiScSavPj85wg0l4pgQfEFPXn0iQI3TmiDg8MhuLe7Lt6AqaYqjQQKLMgZn0Fr46ElvHxNwVM1Lr3vawOrT127-Jgio5P0f425JAzw90RyWMgsa9p97K_nWDh6OmazNKpo5K4VMQiZD7_CLX-I1l4rQ';

interface ConcatenateVideoRequest {
  videoUrls: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ConcatenateVideoRequest = await request.json();
    const { videoUrls } = body;

    if (!videoUrls || videoUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: '缺少视频 URL 列表' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 将视频 URL 数组转换为字符串格式
    const videoUrlsString = JSON.stringify(videoUrls);

    // 调用 Coze 流式 API
    const response = await fetch(COZE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_API_KEY}`,
      },
      body: JSON.stringify({
        content: {
          query: {
            prompt: [
              {
                type: 'text',
                content: {
                  text: videoUrlsString,
                },
              },
            ],
          },
        },
        type: 'query',
        session_id: `session_${Date.now()}`,
        project_id: 7619625794289254443,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coze API 错误:', errorText);
      return new Response(
        JSON.stringify({ error: '视频拼接请求失败', details: errorText }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const reader = response.body?.getReader();

    if (!reader) {
      return new Response(
        JSON.stringify({ error: '无法读取响应流' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        let concatenatedVideoUrl: string | null = null;
        let answerBuffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // 流结束，发送最终结果
              // 如果没有从 tool_response 获取到 URL，尝试从 answer 中解析
              if (!concatenatedVideoUrl && answerBuffer) {
                try {
                  const answerData = JSON.parse(answerBuffer);
                  if (answerData.concatenated_video_url) {
                    concatenatedVideoUrl = answerData.concatenated_video_url;
                  }
                } catch {
                  // 尝试正则提取
                  const match = answerBuffer.match(/"concatenated_video_url":\s*"([^"]+)"/);
                  if (match) {
                    concatenatedVideoUrl = match[1];
                  }
                }
              }

              if (concatenatedVideoUrl) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'complete',
                    concatenatedVideoUrl,
                  })}\n\n`)
                );
              } else {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'error',
                    error: '未能获取拼接视频 URL',
                  })}\n\n`)
                );
              }
              controller.close();
              break;
            }

            // 解码数据块
            const chunk = new TextDecoder().decode(value);
            buffer += chunk;

            // 解析 SSE 数据
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留未完成的行

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  // 检查是否是 sequence_id=3 的 tool_response
                  if (data.sequence_id === 3 && data.type === 'tool_response' && data.content) {
                    try {
                      const content = JSON.parse(data.content);
                      if (content.concatenated_video_url) {
                        concatenatedVideoUrl = content.concatenated_video_url;
                      }
                    } catch {
                      // content 可能不是 JSON，尝试正则提取
                      const match = data.content.match(/"concatenated_video_url":\s*"([^"]+)"/);
                      if (match) {
                        concatenatedVideoUrl = match[1];
                      }
                    }
                  }

                  // 收集 answer 类型的数据
                  if (data.type === 'answer' && data.content?.answer) {
                    answerBuffer += data.content.answer;
                  }

                  // 转发给前端
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                  );
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        } catch (error) {
          console.error('流处理错误:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: '流处理异常',
            })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('视频拼接错误:', error);
    return new Response(
      JSON.stringify({ error: '视频拼接服务异常' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
