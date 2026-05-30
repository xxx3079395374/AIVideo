'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RoleHeader } from '@/components/role-header';
import { useCreation } from '@/lib/store';

type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ResultPage() {
  const router = useRouter();
  const { videoTasks, concatenatedVideoUrl, concatenatedVideoCount, setConcatenatedVideo, isConcatenating, setIsConcatenating } = useCreation();
  const [status, setStatus] = useState<LoadingStatus>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasCalledApi = useRef(false);

  // 获取所有已完成视频的 URL
  const completedVideoUrls = videoTasks
    .filter(task => task.status === 'completed' && task.videoUrl)
    .map(task => task.videoUrl as string);

  const currentVideoCount = completedVideoUrls.length;

  // ComfyUI 原始地址需走代理，CDN 直链直接使用
  const getPlayableUrl = (url: string): string => {
    if (url.includes('/api/view')) {
      return `/api/video-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // 检查是否需要重新拼接
  const needsConcatenation = () => {
    // 没有视频，不需要拼接
    if (currentVideoCount === 0) return false;
    
    // 没有缓存的视频，需要拼接
    if (!concatenatedVideoUrl) return true;
    
    // 视频数量变化，需要重新拼接
    if (concatenatedVideoCount !== currentVideoCount) return true;
    
    // 有缓存且数量一致，不需要重新拼接
    return false;
  };

  useEffect(() => {
    // 如果没有已完成的视频，不自动调用接口
    if (currentVideoCount === 0) {
      setStatus('idle');
      return;
    }

    // 只有一个视频，直接展示，不拼接
    if (currentVideoCount === 1) {
      const singleUrl = completedVideoUrls[0];
      setConcatenatedVideo(singleUrl, 1);
      setVideoUrl(singleUrl);
      setStatus('success');
      setIsConcatenating(false);
      return;
    }

    // 检查是否需要重新拼接
    if (!needsConcatenation()) {
      // 使用缓存的视频
      setVideoUrl(concatenatedVideoUrl || null);
      setStatus('success');
      setIsConcatenating(false);
      return;
    }

    // 防止重复调用
    if (hasCalledApi.current) return;
    hasCalledApi.current = true;

    // 自动调用拼接接口
    const concatenateVideos = async () => {
      setStatus('loading');
      setErrorMessage('');
      setIsConcatenating(true);

      try {
        const response = await fetch('/api/concatenate-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoUrls: completedVideoUrls,
          }),
        });

        if (!response.ok) {
          throw new Error('视频拼接请求失败');
        }

        // 处理流式响应
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取响应流');
        }

        const decoder = new TextDecoder();
        let concatenatedUrl: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                // 检查是否是完成信号
                if (data.type === 'complete' && data.concatenatedVideoUrl) {
                  concatenatedUrl = data.concatenatedVideoUrl;
                } else if (data.type === 'error') {
                  throw new Error(data.error || '视频拼接失败');
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }

        if (concatenatedUrl) {
          // 更新缓存
          setConcatenatedVideo(concatenatedUrl, currentVideoCount);
          setVideoUrl(concatenatedUrl);
          setStatus('success');
          setIsConcatenating(false);
        } else {
          throw new Error('未能获取拼接视频 URL');
        }
      } catch (error) {
        console.error('视频拼接失败:', error);
        setErrorMessage(error instanceof Error ? error.message : '视频拼接失败');
        setStatus('error');
        setIsConcatenating(false);
        hasCalledApi.current = false; // 允许重试
      }
    };

    concatenateVideos();
  }, [currentVideoCount]); // 只在视频数量变化时触发

  // 没有已完成的视频
  if (currentVideoCount === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <RoleHeader currentStep="result" />
        <div className="py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-[rgba(59,255,90,0.1)] shadow-[0_0_24px_rgba(59,255,90,0.12)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#3BFF5A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#E8F8FF] mb-2">暂无视频成品</h2>
              <p className="text-[#6B9AB5] mb-6">请先在视频生成页面生成视频</p>
              <button
                onClick={() => router.push('/video')}
                className="px-6 py-2.5 bg-gradient-to-r from-[#3BFF5A] to-[#00C8FF] text-[#0a1628] rounded-xl font-bold transition-all duration-150 shadow-[0_0_20px_rgba(59,255,90,0.3)] hover:shadow-[0_0_32px_rgba(59,255,90,0.45)] active:scale-95"
              >
                前往视频生成
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 加载中
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <RoleHeader currentStep="result" />
        <div className="py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-[rgba(59,255,90,0.08)] shadow-[0_0_24px_rgba(59,255,90,0.1)] flex items-center justify-center mx-auto mb-4">
                <div className="w-10 h-10 border-4 border-[#3BFF5A] border-t-transparent rounded-full animate-spin shadow-[0_0_12px_rgba(59,255,90,0.3)]" />
              </div>
              <h2 className="text-xl font-semibold text-[#E8F8FF] mb-2">视频拼接中...</h2>
              <p className="text-[#6B9AB5]">正在将 {currentVideoCount} 个视频拼接成成品，请稍候</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 拼接失败
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <RoleHeader currentStep="result" />
        <div className="py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-[rgba(255,61,0,0.1)] shadow-[0_0_24px_rgba(255,61,0,0.12)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#FF3D00]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#E8F8FF] mb-2">视频拼接失败</h2>
              <p className="text-[#6B9AB5] mb-6">{errorMessage}</p>
              <button
                onClick={() => {
                  hasCalledApi.current = false;
                  setConcatenatedVideo('', 0);
                  window.location.reload();
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-[#3BFF5A] to-[#00C8FF] text-[#0a1628] rounded-xl font-bold transition-all duration-150 shadow-[0_0_20px_rgba(59,255,90,0.3)] hover:shadow-[0_0_32px_rgba(59,255,90,0.45)] active:scale-95"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 成功展示视频
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <RoleHeader currentStep="result" />
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#3BFF5A] to-[#00C8FF] mb-4 shadow-[0_0_24px_rgba(59,255,90,0.35)]">
              <svg className="w-8 h-8 text-[#0a1628]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#E8F8FF] mb-2">视频成品</h1>
            <p className="text-[#6B9AB5]">恭喜！您的视频已成功生成</p>
          </div>

          {/* Video Player */}
          <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-2xl p-6 border border-[rgba(0,200,255,0.16)] shadow-[0_0_32px_rgba(0,200,255,0.1)]">
            <div className="aspect-video bg-[rgba(0,200,255,0.04)] rounded-xl overflow-hidden">
              {videoUrl && (
                <video
                  src={getPlayableUrl(videoUrl)}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => router.push('/video')}
              className="px-6 py-3 rounded-xl border-2 border-[rgba(0,200,255,0.2)] bg-[rgba(22,48,84,0.6)] text-[#B8D8F0] hover:border-[rgba(0,200,255,0.4)] hover:bg-[rgba(22,48,84,0.9)] hover:text-[#E8F8FF] transition-all duration-150 shadow-sm active:scale-95"
            >
              返回编辑
            </button>
            {videoUrl && (
              <a
                href={getPlayableUrl(videoUrl)}
                download
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#3BFF5A] to-[#00C8FF] text-[#0a1628] font-bold transition-all duration-150 shadow-[0_0_20px_rgba(59,255,90,0.35)] hover:shadow-[0_0_32px_rgba(59,255,90,0.5)] active:scale-95 inline-block"
              >
                下载视频
              </a>
            )}
          </div>

          {/* Tips */}
          <div className="mt-8 bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-xl p-4 border border-[rgba(0,200,255,0.16)] shadow-[0_0_16px_rgba(0,200,255,0.06)]">
            <h3 className="text-[#E8F8FF] font-medium mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#FFB800]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              温馨提示
            </h3>
            <ul className="text-[#6B9AB5] text-sm space-y-1">
              <li>• 视频链接有效期为 24 小时，请及时下载保存</li>
              <li>• 如需重新编辑，可返回视频生成页面调整</li>
              <li>• 视频分辨率为 720p，帧率 24fps</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
