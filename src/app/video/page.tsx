'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCreation } from '@/lib/store';
import { RoleHeader } from '@/components/role-header';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { VideoTask, VideoDuration } from '@/types';
import { VIDEO_DURATIONS } from '@/types';

// 视频生成方式配置
const SHOW_METHOD_SELECTOR = false;
const VIDEO_METHODS = [
  { value: 'comfyui', label: 'ComfyUI', description: '本地渲染，高质量' },
  { value: 'huoshan', label: '火山引擎', description: '云端生成，速度快' },
] as const;

export default function VideoPage() {
  const router = useRouter();
  const { 
    storyboardImages, 
    videoTasks, 
    addVideoTask, 
    updateVideoTask, 
    deleteVideoTask, 
    setConcatenatedVideo,
    videoGenerationMethod,
    setVideoGenerationMethod,
    setVideoTaskDuration,
    isConcatenating,
    setIsConcatenating,
    concatenatedVideoUrl,
    concatenatedVideoCount,
  } = useCreation();
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [playingTaskId, setPlayingTaskId] = useState<string | null>(null);

  const pollingRef = useRef<Set<string>>(new Set());
  const cancelledRef = useRef(false);
  const pollVideoStatusFn = useRef<typeof pollVideoStatus>(null as any);
  const pollHuoshanVideoStatusFn = useRef<typeof pollHuoshanVideoStatus>(null as any);
  const videoTasksRef = useRef(videoTasks);
  videoTasksRef.current = videoTasks;
  const videoGenerationMethodRef = useRef(videoGenerationMethod);
  videoGenerationMethodRef.current = videoGenerationMethod;

  // 只使用已生成的分镜图片
  const completedImages = storyboardImages.filter(img => img.status === 'completed');

  // 如果没有已完成的分镜图片，显示空状态
  if (completedImages.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <RoleHeader currentStep="video" />
        <div className="py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-[rgba(255,184,0,0.1)] shadow-[0_0_24px_rgba(255,184,0,0.12)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#FFB800]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#E8F8FF] mb-2">暂无可用分镜</h2>
              <p className="text-[#6B9AB5] mb-6">请先在分镜生成页面生成至少一张分镜图片</p>
              <button
                onClick={() => router.push('/storyboard')}
                className="px-6 py-2.5 bg-gradient-to-r from-[#FFB800] to-[#FF6B1A] text-white rounded-xl font-medium transition-all duration-150 shadow-[0_0_20px_rgba(255,184,0,0.3)] hover:shadow-[0_0_32px_rgba(255,184,0,0.45)] active:scale-95"
              >
                前往分镜生成
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSelectImage = (imageId: string) => {
    if (selectedStart === imageId) {
      setSelectedStart(null);
    } else if (selectedEnd === imageId) {
      setSelectedEnd(null);
    } else if (!selectedStart) {
      setSelectedStart(imageId);
    } else if (!selectedEnd) {
      setSelectedEnd(imageId);
    }
  };

  const handleCreateVideoTask = () => {
    if (!selectedStart || !selectedEnd) return;

    const startImage = completedImages.find(img => img.id === selectedStart);
    const endImage = completedImages.find(img => img.id === selectedEnd);

    if (!startImage || !endImage) return;

    const newTask: VideoTask = {
      id: `task-${Date.now()}`,
      name: `${startImage.title} → ${endImage.title}`,
      startFrameId: selectedStart,
      endFrameId: selectedEnd,
      startFrameUrl: startImage.imageUrl,
      endFrameUrl: endImage.imageUrl,
      startFramePrompt: startImage.prompt,
      endFramePrompt: endImage.prompt,
      status: 'pending',
      duration: 5,
    };

    addVideoTask(newTask);
    setSelectedStart(null);
    setSelectedEnd(null);
  };

  // 轮询查询视频状态
  const pollVideoStatus = async (taskId: string, localTaskId: string) => {
    const maxAttempts = 60; // 最多轮询 60 次（约 5 分钟）
    const interval = 5000; // 每 5 秒轮询一次

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`/api/video-status/${taskId}`);
        const data = await response.json();

        // ComfyUI API 响应格式
        if (data.status === 'completed' && data.videoUrl) {
          updateVideoTask(localTaskId, {
            status: 'completed',
            videoUrl: data.videoUrl,
          });
          pollingRef.current.delete(localTaskId);
          return;
        } else if (data.status === 'failed' || data.status === 'timeout') {
          updateVideoTask(localTaskId, { status: 'failed' });
          pollingRef.current.delete(localTaskId);
          return;
        } else if (data.error) {
          console.error('[ComfyUI] 错误:', data.error);
          updateVideoTask(localTaskId, { status: 'failed' });
          pollingRef.current.delete(localTaskId);
          return;
        }

        if (cancelledRef.current) {
          pollingRef.current.delete(localTaskId);
          return;
        }
        // 继续轮询
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error('轮询视频状态失败:', error);
        if (cancelledRef.current) {
          pollingRef.current.delete(localTaskId);
          return;
        }
        // 继续轮询，不中断
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    // 超时处理
    updateVideoTask(localTaskId, { status: 'failed' });
    pollingRef.current.delete(localTaskId);
  };

  // 轮询查询火山引擎视频状态
  const pollHuoshanVideoStatus = async (taskId: string, localTaskId: string) => {
    const maxAttempts = 60; // 最多轮询 60 次（约 5 分钟）
    const interval = 5000; // 每 5 秒轮询一次

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`/api/huoshan-video-status/${taskId}`);
        const data = await response.json();

        if (data.success) {
          if (data.status === 'completed' && data.videoUrl) {
            updateVideoTask(localTaskId, {
              status: 'completed',
              videoUrl: data.videoUrl,
            });
            pollingRef.current.delete(localTaskId);
            return;
          } else if (data.status === 'failed') {
            updateVideoTask(localTaskId, { status: 'failed' });
            pollingRef.current.delete(localTaskId);
            return;
          }
        }

        if (cancelledRef.current) {
          pollingRef.current.delete(localTaskId);
          return;
        }
        // 继续轮询
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error('轮询火山引擎视频状态失败:', error);
        if (cancelledRef.current) {
          pollingRef.current.delete(localTaskId);
          return;
        }
        // 继续轮询，不中断
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    // 超时处理
    updateVideoTask(localTaskId, { status: 'failed' });
    pollingRef.current.delete(localTaskId);
  };

  pollVideoStatusFn.current = pollVideoStatus;
  pollHuoshanVideoStatusFn.current = pollHuoshanVideoStatus;

  useEffect(() => {
    cancelledRef.current = false;
    const generatingTasks = videoTasksRef.current.filter(
      t => t.status === 'generating' && t.taskId
    );
    for (const task of generatingTasks) {
      if (!pollingRef.current.has(task.id)) {
        pollingRef.current.add(task.id);
        const fn = videoGenerationMethodRef.current === 'huoshan'
          ? pollHuoshanVideoStatusFn.current
          : pollVideoStatusFn.current;
        fn(task.taskId!, task.id);
      }
    }
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const handleGenerateVideo = async (task: VideoTask) => {
    if (!task.startFrameUrl || !task.endFrameUrl) {
      alert('缺少分镜图片 URL');
      return;
    }

    pollingRef.current.add(task.id);
    updateVideoTask(task.id, { status: 'generating' });

    try {
      // 根据选择的引擎调用不同的 API（选择器隐藏时强制使用 ComfyUI）
      const effectiveMethod = SHOW_METHOD_SELECTOR ? videoGenerationMethod : 'comfyui';
      const apiEndpoint = effectiveMethod === 'huoshan'
        ? '/api/huoshan-generate-video'
        : '/api/generate-video';

      const statusEndpoint = effectiveMethod === 'huoshan'
        ? pollHuoshanVideoStatus
        : pollVideoStatus;

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startFrameUrl: task.startFrameUrl,
          endFrameUrl: task.endFrameUrl,
          startFramePrompt: task.startFramePrompt || '',
          endFramePrompt: task.endFramePrompt || '',
          duration: task.duration,
        }),
      });

      const data = await response.json();

      if (data.taskId) {
        // 保存任务 ID
        updateVideoTask(task.id, { taskId: data.taskId });
        // 开始轮询状态
        statusEndpoint(data.taskId, task.id);
      } else {
        throw new Error(data.error || '视频生成请求失败');
      }
    } catch (error) {
      console.error('视频生成失败:', error);
      updateVideoTask(task.id, { status: 'failed' });
      pollingRef.current.delete(task.id);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    deleteVideoTask(taskId);
  };

  // 生成视频成品：标记拼接状态并跳转到结果页
  const handleConcatenateVideos = () => {
    const completedTasks = videoTasks.filter(t => t.status === 'completed' && t.videoUrl);
    if (completedTasks.length === 0) {
      alert('请先生成至少一个视频');
      return;
    }

    setIsConcatenating(true);
    router.push('/result');
  };

  const completedTasks = videoTasks.filter(t => t.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <RoleHeader currentStep="video" />
      <div className="py-6 md:py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header - Responsive */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          {/* Title */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#E8F8FF]">视频生成</h1>
            <p className="text-[#6B9AB5] text-xs md:text-sm mt-1">选择首帧和尾帧分镜图片，生成过渡视频</p>
          </div>

          {/* Controls */}
          <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 xs:gap-4 md:gap-6">
            {/* 视频生成方式切换（暂隐藏，默认使用 ComfyUI） */}
            {SHOW_METHOD_SELECTOR && (
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-xs md:text-sm text-[#6B9AB5] hidden sm:inline">生成方式:</span>
              <RadioGroup
                value={videoGenerationMethod}
                onValueChange={(value) => setVideoGenerationMethod(value as 'comfyui' | 'huoshan')}
                className="flex items-center gap-2 md:gap-3"
              >
                {VIDEO_METHODS.map((method) => (
                  <div key={method.value} className="flex items-center gap-1 md:gap-1.5">
                    <RadioGroupItem
                      value={method.value}
                      id={method.value}
                      className="h-3.5 w-3.5 md:h-4 md:w-4"
                    />
                    <label
                      htmlFor={method.value}
                      className={cn(
                        'text-xs md:text-sm font-medium cursor-pointer transition-colors',
                        videoGenerationMethod === method.value
                          ? 'text-[#FFB800]'
                          : 'text-[#6B9AB5] hover:text-[#B8D8F0]'
                      )}
                    >
                      {method.label}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            )}

            {/* Video count */}
            <span className="text-xs md:text-sm text-[#6B9AB5]">
              已生成 <span className="text-[#FFB800] font-semibold">{completedTasks}</span> 个视频
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left: Image Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Selection Info */}
            <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-xl p-3 md:p-4 border border-[rgba(0,200,255,0.16)] shadow-[0_0_16px_rgba(0,200,255,0.06)]">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-3">
                <h3 className="text-[#E8F8FF] font-medium text-sm md:text-base">选择分镜图片</h3>
                <div className="flex items-center gap-2">
                  {selectedStart && (
                    <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-[rgba(0,200,255,0.15)] text-[#00C8FF] text-xs rounded-lg font-medium border border-[rgba(0,200,255,0.2)]">
                      首帧: {completedImages.find(img => img.id === selectedStart)?.sceneCode}
                    </span>
                  )}
                  {selectedEnd && (
                    <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-[rgba(255,184,0,0.15)] text-[#FFB800] text-xs rounded-lg font-medium border border-[rgba(255,184,0,0.2)]">
                      尾帧: {completedImages.find(img => img.id === selectedEnd)?.sceneCode}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[#6B9AB5] text-sm">点击选择首帧，再点击选择尾帧。选择完成后点击"创建视频任务"按钮。</p>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-4 gap-3">
              {completedImages.map((image) => {
                const isStart = selectedStart === image.id;
                const isEnd = selectedEnd === image.id;

                return (
                  <button
                    key={image.id}
                    onClick={() => handleSelectImage(image.id)}
                    className={cn(
                      'aspect-video bg-[rgba(22,48,84,0.92)] rounded-xl overflow-hidden border-2 transition-all duration-200 relative shadow-sm hover:shadow-md',
                      isStart ? 'border-[#00C8FF] shadow-[0_0_16px_rgba(0,200,255,0.25)]' : isEnd ? 'border-[#FFB800] shadow-[0_0_16px_rgba(255,184,0,0.25)]' : 'border-[rgba(0,200,255,0.14)] hover:border-[rgba(0,200,255,0.3)]'
                    )}
                  >
                    {/* 分镜图片 - 展示真实图片 */}
                    {image.imageUrl ? (
                      <img
                        src={image.imageUrl}
                        alt={image.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[rgba(0,200,255,0.04)] flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 rounded-lg bg-[rgba(22,48,84,0.8)] flex items-center justify-center mx-auto mb-1 shadow-sm">
                            <svg className="w-4 h-4 text-[#2E4F68]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Label - 显示 sceneCode + title */}
                    <div className="absolute bottom-0 left-0 right-0 bg-[rgba(14,32,60,0.9)] backdrop-blur-sm px-2 py-1">
                      <span className="text-[#E8F8FF] text-xs font-medium">{image.sceneCode}</span>
                      <span className="text-[#6B9AB5] text-xs ml-1 truncate">{image.title}</span>
                    </div>
                    {/* Selection Badge */}
                    {isStart && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#00C8FF] text-[#0a1628] text-xs rounded-lg font-medium shadow-[0_0_8px_rgba(0,200,255,0.3)]">
                        首帧
                      </div>
                    )}
                    {isEnd && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-[#FFB800] text-[#0a1628] text-xs rounded-lg font-medium shadow-[0_0_8px_rgba(255,184,0,0.3)]">
                        尾帧
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Create Task Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleCreateVideoTask}
                disabled={!selectedStart || !selectedEnd}
                className={cn(
                  'px-6 py-3 rounded-xl font-medium transition-all duration-150 active:scale-95',
                  selectedStart && selectedEnd
                    ? 'bg-gradient-to-r from-[#FFB800] to-[#FF6B1A] text-white shadow-[0_0_20px_rgba(255,184,0,0.3)] hover:shadow-[0_0_32px_rgba(255,184,0,0.45)]'
                    : 'bg-[rgba(0,200,255,0.06)] text-[#2E4F68] cursor-not-allowed'
                )}
              >
                创建视频任务
              </button>
              {completedImages.length === 1 && (
                <p className="text-[#FFB800] text-sm font-medium">
                  ⚠️ 当前只有 1 张分镜，需要至少 2 张才能生成视频
                </p>
              )}
            </div>
          </div>

          {/* Right: Task List */}
          <div className="space-y-4">
            <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-xl p-4 border border-[rgba(0,200,255,0.16)] shadow-[0_0_16px_rgba(0,200,255,0.06)]">
              <h3 className="text-[#E8F8FF] font-medium mb-3">视频任务列表</h3>

              {videoTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-[rgba(0,200,255,0.06)] flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-[#2E4F68]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <p className="text-[#6B9AB5] text-sm">暂无视频任务</p>
                  <p className="text-[#2E4F68] text-xs mt-1">选择分镜图片创建任务</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {videoTasks.map((task) => {
                    const isGenerating = task.status === 'generating';
                    const isCompleted = task.status === 'completed';

                    return (
                      <div
                        key={task.id}
                        className="bg-[rgba(14,32,60,0.5)] rounded-xl p-3 border border-[rgba(0,200,255,0.1)]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[#E8F8FF] text-sm font-medium truncate flex-1">
                            {task.name}
                          </span>
                          {isCompleted && (
                            <svg className="w-4 h-4 text-[#3BFF5A] shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>

                        {/* Frame Preview */}
                        <div className="flex gap-2 mb-2">
                          <div className="flex-1">
                            <div className="aspect-video bg-[rgba(0,200,255,0.04)] rounded-lg overflow-hidden border border-[rgba(0,200,255,0.14)]">
                              {task.startFrameUrl ? (
                                <img
                                  src={task.startFrameUrl}
                                  alt="首帧"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[rgba(0,200,255,0.04)]">
                                  <span className="text-[#2E4F68] text-xs">首帧</span>
                                </div>
                              )}
                            </div>
                            <p className="text-[#6B9AB5] text-xs mt-1 truncate">
                              {completedImages.find(img => img.id === task.startFrameId)?.title || '首帧'}
                            </p>
                          </div>
                          <div className="flex items-center shrink-0">
                            <svg className="w-4 h-4 text-[#2E4F68]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="aspect-video bg-[rgba(255,184,0,0.04)] rounded-lg overflow-hidden border border-[rgba(255,184,0,0.14)]">
                              {task.endFrameUrl ? (
                                <img
                                  src={task.endFrameUrl}
                                  alt="尾帧"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[rgba(255,184,0,0.04)]">
                                  <span className="text-[#2E4F68] text-xs">尾帧</span>
                                </div>
                              )}
                            </div>
                            <p className="text-[#6B9AB5] text-xs mt-1 truncate">
                              {completedImages.find(img => img.id === task.endFrameId)?.title || '尾帧'}
                            </p>
                          </div>
                        </div>

                        {/* Duration Selector */}
                        {!isCompleted && !isGenerating && (
                          <div className="mb-2">
                            <p className="text-xs text-[#6B9AB5] mb-1.5">视频时长</p>
                            <div className="flex gap-1">
                              {VIDEO_DURATIONS.map((duration) => (
                                <button
                                  key={duration}
                                  onClick={() => setVideoTaskDuration(task.id, duration as VideoDuration)}
                                  className={cn(
                                    'flex-1 py-1 text-xs rounded-lg transition-all duration-150 font-medium active:scale-95',
                                    task.duration === duration
                                      ? 'bg-[#FFB800] text-[#0a1628] shadow-[0_0_8px_rgba(255,184,0,0.3)]'
                                      : 'bg-[rgba(0,200,255,0.06)] text-[#6B9AB5] hover:bg-[rgba(0,200,255,0.12)] hover:text-[#B8D8F0]'
                                  )}
                                >
                                  {duration}秒
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {isCompleted ? (
                            <button
                              onClick={() => setPlayingTaskId(playingTaskId === task.id ? null : task.id)}
                              className="flex-1 py-1.5 bg-[rgba(59,255,90,0.12)] text-[#3BFF5A] text-sm rounded-lg hover:bg-[rgba(59,255,90,0.2)] transition-all duration-150 font-medium active:scale-95"
                            >
                              {playingTaskId === task.id ? '关闭视频' : '播放视频'}
                            </button>
                          ) : isGenerating ? (
                            <button disabled className="flex-1 py-1.5 bg-[rgba(0,200,255,0.1)] text-[#00C8FF] text-sm rounded-lg flex items-center justify-center gap-2 font-medium">
                              <div className="w-3 h-3 border-2 border-[#00C8FF] border-t-transparent rounded-full animate-spin" />
                              生成中
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGenerateVideo(task)}
                              className="flex-1 py-1.5 bg-[rgba(255,184,0,0.12)] text-[#FFB800] text-sm rounded-lg hover:bg-[rgba(255,184,0,0.2)] transition-all duration-150 font-medium active:scale-95"
                            >
                              生成视频
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="px-2 py-1.5 text-[#2E4F68] hover:text-[#FF3D00] transition-colors duration-150"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>

                        {/* Video Player */}
                        {playingTaskId === task.id && task.videoUrl && (
                          <div className="mt-2">
                            <video
                              src={`/api/video-proxy?url=${encodeURIComponent(task.videoUrl)}`}
                              controls
                              autoPlay
                              className="w-full rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions - Responsive */}
        <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/storyboard')}
            className="w-full sm:w-auto px-6 py-2.5 md:py-3 rounded-xl border-2 border-[rgba(0,200,255,0.2)] bg-[rgba(22,48,84,0.6)] text-[#B8D8F0] hover:border-[rgba(0,200,255,0.4)] hover:bg-[rgba(22,48,84,0.9)] hover:text-[#E8F8FF] transition-all duration-150 shadow-sm active:scale-95"
          >
            上一步
          </button>
          <button
            onClick={handleConcatenateVideos}
            disabled={isConcatenating || completedTasks === 0}
            className={cn(
              'w-full sm:w-auto px-6 md:px-8 py-2.5 md:py-3 rounded-xl text-white font-medium transition-all duration-150 active:scale-95',
              isConcatenating || completedTasks === 0
                ? 'bg-[rgba(0,200,255,0.06)] text-[#2E4F68] cursor-not-allowed'
                : 'bg-gradient-to-r from-[#FFB800] to-[#FF6B1A] shadow-[0_0_20px_rgba(255,184,0,0.35)] hover:shadow-[0_0_32px_rgba(255,184,0,0.5)]'
            )}
          >
            {isConcatenating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                拼接中...
              </span>
            ) : (
              '生成视频成品'
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
