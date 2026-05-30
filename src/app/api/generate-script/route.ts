import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Coze Bot 配置
const COZE_API_URL = 'https://gnh9tmgvwk.coze.site/stream_run';
const COZE_PROJECT_ID = 7618049625848545334;

const COZE_AUTH_TOKEN =
  process.env.COZE_SCRIPT_BOT_TOKEN ||
  'eyJhbGciOiJSUzI1NiIsImtpZCI6ImFmMDQyOWY0LWY4YTItNDAxZi05N2UwLTg3M2M2ODcxZTUyZiJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbImZzTGlGNHZ0eDBnYTFhb0dFZTF4V2pQY3pKcWxucXA3Il0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzc4NTY3NjEwLCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjE4MDUxMjgyNzcwNTkxODA3Iiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NjM4ODg5NzE5NjI2OTg5NTg3In0.rjRyxGx3FXgIeC58lT0Ibjf7SbsYCM2zaKWD2UN4gxf2KT9c33SVbkV9kXyb-gQ7-Odut7AYl4RA9gwl6vjwxFM9pgKm4nMNm8avzt5mWXmqdH_pQlCnmu1ogOn6XYhOpzIa8D8Lf17iV1avQX0r3f4HiLaq7pZeHjMgCME8tB52cUCmGmw0S583Aofw2pFB0NM0yoX-Sx5ynXdA6QFW9bdOTFyzVPO4S4jS7UEuOtzoZ9oGHr9bqEVBZkLH-E1_wvfOTlcyfC5gB7Iu-svn9Ovtqo6E5fFWE8TfsaAKSlDG7mVNaphmdWuifAjRXO4ApyFGiCrSxt9U3_jAo7m5Dg';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: '请输入文案内容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 调用 Coze Bot 流式 API
    const response = await fetch(COZE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        content: {
          query: {
            prompt: [
              {
                type: 'text',
                content: {
                  text,
                },
              },
            ],
          },
        },
        type: 'query',
        session_id: `session_${Date.now()}`,
        project_id: COZE_PROJECT_ID,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coze Bot API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `AI 服务请求失败: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 转发流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const streamResponse = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  // 转发 answer 类型的消息（前端期望的格式）
                  if (data.type === 'answer' && data.content?.answer) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'answer', content: { answer: data.content.answer } })}\n\n`)
                    );
                  }

                  // 如果 Coze 返回了最终完成信号
                  if (data.done) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(streamResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Generate script error:', error);
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
