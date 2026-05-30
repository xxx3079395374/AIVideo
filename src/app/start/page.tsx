'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCreation } from '@/lib/store';
import { RoleHeader } from '@/components/role-header';
import { SceneCard, SceneCardSkeleton } from '@/components/scene-card';
import { VoiceWaveModal } from '@/components/voice-wave-modal';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ScriptScene } from '@/types';
import { STYLE_CONFIGS, type ImageStyle } from '@/types';

export default function StartPage() {
  const router = useRouter();
  const { 
    originalText, 
    setOriginalText,
    style,
    setStyle,
    generatedScript, 
    setGeneratedScript, 
    updateScriptScene,
    addScriptScene,
    deleteScriptScene,
    setCurrentStep,
    setStoryboardImages,
    setCharacters,
    setScenes,
  } = useCreation();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'original' | 'script'>('original');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [visibleSceneIndex, setVisibleSceneIndex] = useState(-1);
  const [isStreaming, setIsStreaming] = useState(false);
  const scriptContainerRef = useRef<HTMLDivElement>(null);
  
  // 语音识别相关状态
  const recognitionRef = useRef<any>(null);
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'recognizing' | 'success' | 'error'>('idle');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [interimResult, setInterimResult] = useState('');
  const [lastVoiceInputTime, setLastVoiceInputTime] = useState<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const baseTextRef = useRef(''); // 保存开始录音时的基础文本
  const accumulatedTextRef = useRef(''); // 累积的识别文本

  // 添加场景弹窗状态
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSceneTitle, setNewSceneTitle] = useState('');
  const [newSceneSummary, setNewSceneSummary] = useState('');
  const [newSceneLocation, setNewSceneLocation] = useState('');
  const [newSceneTime, setNewSceneTime] = useState('');
  const [newSceneWeather, setNewSceneWeather] = useState('');
  const [newSceneCharacters, setNewSceneCharacters] = useState('');
  const [newSceneDescription, setNewSceneDescription] = useState('');

  // 删除确认弹窗状态
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // 解析 AI 返回的文本为剧本结构
  const parseScriptText = (text: string): ScriptScene[] => {
    const scenes: ScriptScene[] = [];
    
    // 尝试解析 JSON 格式
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((item, index) => {
            // 合并 content 和 description（读取自后端返回的数据）
            const content = (item as any).content || '';
            const description = (item as any).description || '';
            const fullDescription = content && description 
              ? `${content}\n${description}` 
              : (content || description);
            
            return ({
              id: item.id || `scene-${index + 1}`,
              sceneNumber: item.sceneNumber || index + 1,
              sceneCode: item.sceneCode || `${Math.floor(index / 2) + 1}-${(index % 2) + 1}`,
              title: item.title || `场景 ${index + 1}`,
              location: item.location || item.sceneLocation || '未指定',
              summary: item.summary || '',
              sceneLocation: item.sceneLocation || '',
              time: item.time || '',
              weather: item.weather || '',
              characters: item.characters || '',
              description: fullDescription,
            });
          });
        }
      }
    } catch (e) {
      console.log('JSON parse failed, trying text parsing');
    }
    
    // 文本解析：按场次分割
    const lines = text.split('\n');
    let currentScene: Partial<ScriptScene> | null = null;
    let sceneNumber = 0;
    let tempContent = ''; // 临时存储场景内容
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      const sceneMatch = trimmedLine.match(/^(第[一二三四五六七八九十]+[幕场]|场景\s*\d+|\d+-\d+|Scene\s*\d+)/i);
      
      if (sceneMatch) {
        if (currentScene && currentScene.title) {
          const description = currentScene.description || '';
          const fullDescription = tempContent && description 
            ? `${tempContent}\n${description}` 
            : (tempContent || description);
          
          scenes.push({
            id: `scene-${sceneNumber}`,
            sceneNumber: sceneNumber,
            sceneCode: currentScene.sceneCode || `${sceneNumber}-1`,
            title: currentScene.title || '',
            location: currentScene.location || '未指定',
            summary: currentScene.summary || '',
            sceneLocation: currentScene.sceneLocation || '',
            time: currentScene.time || '',
            weather: currentScene.weather || '',
            characters: currentScene.characters || '',
            description: fullDescription,
          } as ScriptScene);
        }
        
        sceneNumber++;
        tempContent = ''; // 重置临时内容
        currentScene = {
          sceneNumber,
          sceneCode: `${Math.floor((sceneNumber - 1) / 2) + 1}-${((sceneNumber - 1) % 2) + 1}`,
          title: sceneMatch[1],
        };
      } else if (currentScene) {
        if (trimmedLine) {
          tempContent = tempContent + trimmedLine + '\n'; // 累积到临时内容
          if (!currentScene.description && trimmedLine.length > 10) {
            currentScene.description = trimmedLine;
          }
        }
      }
    }
    
    if (currentScene && currentScene.title) {
      const description = currentScene.description || '';
      const fullDescription = tempContent && description 
        ? `${tempContent}\n${description}` 
        : (tempContent || description);
      
      scenes.push({
        id: `scene-${sceneNumber}`,
        sceneNumber: sceneNumber,
        sceneCode: currentScene.sceneCode || `${sceneNumber}-1`,
        title: currentScene.title || '',
        location: currentScene.location || '未指定',
        summary: currentScene.summary || '',
        sceneLocation: currentScene.sceneLocation || '',
        time: currentScene.time || '',
        weather: currentScene.weather || '',
        characters: currentScene.characters || '',
        description: fullDescription,
      } as ScriptScene);
    }
    
    if (scenes.length === 0 && text.trim()) {
      scenes.push({
        id: 'scene-1',
        sceneNumber: 1,
        sceneCode: '1-1',
        title: '生成的剧本',
        location: '未指定',
        description: text,
      });
    }
    
    return scenes;
  };

  // 语音识别 - 60秒超时检测
  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (voiceState === 'recording') {
        handleStopVoice();
      }
    }, 60000); // 60秒超时
  };

  // 开始语音识别
  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能，请使用 Chrome 浏览器。');
      return;
    }

    // 保存开始录音时的基础文本和清空累积文本
    baseTextRef.current = originalText;
    accumulatedTextRef.current = '';

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onstart = () => {
        setVoiceState('recording');
        setInterimResult('');
        setLastVoiceInputTime(Date.now());
        resetTimeout();
      };

      recognition.onresult = (event: any) => {
        let final = '';
        let interim = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (final) {
          // 累积 final 结果
          accumulatedTextRef.current += final;
          // 将累积结果追加到原始文案（使用基础文本 + 累积的识别结果）
          setOriginalText(baseTextRef.current + accumulatedTextRef.current);
          setLastVoiceInputTime(Date.now());
          resetTimeout();
        }

        if (interim) {
          setInterimResult(interim);
          setLastVoiceInputTime(Date.now());
          resetTimeout();
        }
      };

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        if (event.error !== 'aborted') {
          setVoiceState('error');
          setTimeout(() => setVoiceState('idle'), 2000);
        }
      };

      recognition.onend = () => {
        if (voiceState !== 'recording') {
          setVoiceState('idle');
          setShowVoiceModal(false);
        }
      };

      recognitionRef.current = recognition;
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('启动语音识别失败:', error);
    }
  };

  // 停止语音识别
  const handleStopVoice = () => {
    const rec = recognitionRef.current;
    if (rec && voiceState === 'recording') {
      try {
        rec.stop();
      } catch (error) {
        console.error('停止语音识别失败:', error);
      }
    }

    // 清理定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 关闭音纹浮层
    setShowVoiceModal(false);
    setVoiceState('idle');
    setInterimResult('');
  };

  // 流式调用 AI 接口
  const handleStartCreation = async () => {
    if (!originalText.trim()) return;
    
    setIsProcessing(true);
    setIsStreaming(true);
    setVisibleSceneIndex(-1);
    setGeneratedScript([]);
    // 重新生成剧本时，清空所有下游数据
    setStoryboardImages([]);
    setCharacters([]);
    setScenes([]);
    setActiveTab('script');
    
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`请求失败: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let accumulatedAnswer = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              if (data.type === 'answer' && data.content?.answer) {
                accumulatedAnswer += data.content.answer;
              }
            } catch { /* ignore */ }
          }
        }
      }

      const scriptData = parseScriptText(accumulatedAnswer);
      setGeneratedScript(scriptData);
      setIsStreaming(false);
      
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('生成失败:', error);
      }
      setIsStreaming(false);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const handleDescriptionChange = (sceneId: string, description: string) => {
    updateScriptScene(sceneId, { description });
  };

  const handleDeleteScene = (id: string) => {
    const scene = generatedScript.find(s => s.id === id);
    setDeleteTarget({ id, title: scene?.title || '新场景' });
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteScriptScene(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleOpenAddDialog = () => {
    setNewSceneTitle('');
    setNewSceneSummary('');
    setNewSceneLocation('');
    setNewSceneTime('');
    setNewSceneWeather('');
    setNewSceneCharacters('');
    setNewSceneDescription('');
    setShowAddDialog(true);
  };

  const handleAddScene = () => {
    const title = newSceneTitle.trim() || '新场景';
    addScriptScene({
      title,
      summary: newSceneSummary.trim(),
      sceneLocation: newSceneLocation.trim(),
      time: newSceneTime.trim(),
      weather: newSceneWeather.trim(),
      characters: newSceneCharacters.trim(),
      description: newSceneDescription.trim(),
    });
    setShowAddDialog(false);
  };

  useEffect(() => {
    if (!isStreaming && generatedScript.length > 0 && visibleSceneIndex < generatedScript.length - 1) {
      const timer = setTimeout(() => setVisibleSceneIndex(prev => prev + 1), 500);
      return () => clearTimeout(timer);
    }
  }, [visibleSceneIndex, generatedScript.length, isStreaming]);

  useEffect(() => {
    if (generatedScript.length > 0 && !isStreaming) {
      setVisibleSceneIndex(0);
    }
  }, [generatedScript.length, isStreaming]);

  // 如果已有剧本内容，默认切换到成品剧本标签页
  useEffect(() => {
    if (generatedScript.length > 0) {
      setActiveTab('script');
      setVisibleSceneIndex(generatedScript.length - 1);
    }
  }, []);

  const handleNextStep = () => {
    setCurrentStep('scene');
    router.push('/scene');
  };

  const wordCount = originalText.length;

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <RoleHeader currentStep="start" />
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#E8F8FF] mb-2">创作启动</h1>
          <p className="text-[#6B9AB5]">输入你的创意文案，AI将为你生成专业分镜脚本</p>
        </div>

        {/* Main Editor Card */}
        <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-2xl border border-[rgba(0,200,255,0.16)] shadow-[0_0_32px_rgba(0,200,255,0.1)] overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,200,255,0.12)] bg-[rgba(14,32,60,0.8)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#6B9AB5] hidden sm:inline">AI自动处理区域</span>
              <div className="flex items-center gap-1 bg-[rgba(14,32,60,0.8)] rounded-xl p-1 shadow-sm border border-[rgba(0,200,255,0.12)]">
                <button
                  onClick={() => setActiveTab('original')}
                  className={cn(
                    'px-4 py-1.5 text-sm rounded-lg transition-all duration-150 font-medium active:scale-95',
                    activeTab === 'original'
                      ? 'bg-[#00C8FF] text-[#0a1628] shadow-[0_0_12px_rgba(0,200,255,0.35)]'
                      : 'text-[#6B9AB5] hover:text-[#E8F8FF]'
                  )}
                >
                  <span className="hidden sm:inline">原始文案</span>
                  <span className="sm:hidden">文案</span>
                </button>
                <button
                  onClick={() => setActiveTab('script')}
                  className={cn(
                    'px-4 py-1.5 text-sm rounded-lg transition-all duration-150 font-medium active:scale-95',
                    activeTab === 'script'
                      ? 'bg-[#00C8FF] text-[#0a1628] shadow-[0_0_12px_rgba(0,200,255,0.35)]'
                      : 'text-[#6B9AB5] hover:text-[#E8F8FF]'
                  )}
                >
                  <span className="hidden sm:inline">成品剧本</span>
                  <span className="sm:hidden">剧本</span>
                </button>
              </div>
            </div>
          </div>

          {/* Editor Area */}
          <div className="p-4">
            {activeTab === 'original' ? (
              <div className="relative min-h-[400px]">
                {/* 风格选择 */}
                <div className="mb-4 pb-4 border-b border-[rgba(0,200,255,0.1)]">
                  {/* Desktop: Grid buttons (hidden on mobile) */}
                  <div className="hidden md:block">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-[#6B9AB5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-sm text-[#6B9AB5] font-medium">选择视频风格</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {STYLE_CONFIGS.map((config) => (
                        <button
                          key={config.key}
                          onClick={() => setStyle(config.key as ImageStyle)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95',
                            style === config.key
                              ? 'bg-[#00C8FF] text-[#0a1628] shadow-[0_0_16px_rgba(0,200,255,0.35)] active:shadow-[0_0_28px_rgba(0,200,255,0.5)]'
                              : 'bg-[rgba(0,200,255,0.08)] text-[#6B9AB5] hover:bg-[rgba(0,200,255,0.15)] hover:text-[#E8F8FF]'
                          )}
                        >
                          <span className="mr-1">{config.icon}</span>
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile: Sheet drawer */}
                  <div className="block md:hidden">
                    <Sheet>
                      <SheetTrigger asChild>
                        <button className="w-[calc(100%-4rem)] flex items-center justify-between p-3 bg-[rgba(0,200,255,0.06)] rounded-xl border border-[rgba(0,200,255,0.12)] hover:bg-[rgba(0,200,255,0.12)] transition-all duration-150">
                          <div className="flex items-center gap-2 min-w-0">
                            <svg className="w-4 h-4 text-[#6B9AB5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="text-sm text-[#6B9AB5] shrink-0">风格:</span>
                            <span className="text-sm font-medium text-[#E8F8FF] truncate">
                              {STYLE_CONFIGS.find(c => c.key === style)?.icon} {STYLE_CONFIGS.find(c => c.key === style)?.label}
                            </span>
                          </div>
                          <svg className="w-5 h-5 text-[#6B9AB5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] pb-8 px-4 md:px-6">
                        <SheetHeader className="text-left pb-4 border-b border-[rgba(0,200,255,0.12)]">
                          <SheetTitle className="text-lg font-semibold">选择视频风格</SheetTitle>
                        </SheetHeader>
                        <div className="grid grid-cols-2 gap-3 mt-4 overflow-y-auto max-h-[50vh] pb-4 px-1">
                          {STYLE_CONFIGS.map((config) => (
                            <button
                              key={config.key}
                              onClick={() => {
                                setStyle(config.key as ImageStyle);
                              }}
                              className={cn(
                                'relative p-4 rounded-xl text-sm font-medium transition-all duration-150 flex flex-col items-center gap-2 active:scale-95',
                                style === config.key
                                  ? 'bg-[#00C8FF] text-[#0a1628] shadow-[0_0_20px_rgba(0,200,255,0.35)]'
                                  : 'bg-[rgba(0,200,255,0.08)] text-[#6B9AB5] hover:bg-[rgba(0,200,255,0.15)] hover:text-[#E8F8FF]'
                              )}
                            >
                              <span className="text-2xl">{config.icon}</span>
                              <span>{config.label}</span>
                              {style === config.key && (
                                <svg className="w-5 h-5 absolute top-2 right-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>
                
                {/* Voice Input Toolbar */}
                <div className="absolute top-0 right-0 z-10 flex items-center gap-2 mb-2">
                  {/* <button
                    onClick={() => {
                      if (voiceState === 'recording') {
                        handleStopVoice();
                      } else {
                        setShowVoiceModal(true);
                        startVoiceRecognition();
                      }
                    }}
                    disabled={voiceState === 'recording'}
                    className={cn(
                      'p-3 rounded-xl transition-all duration-150 active:scale-90',
                      voiceState === 'recording'
                        ? 'bg-[rgba(0,200,255,0.15)] text-[#00C8FF] border-2 border-[#00C8FF] cursor-not-allowed'
                        : 'bg-[rgba(22,48,84,0.9)] text-[#6B9AB5] hover:text-[#00C8FF] hover:bg-[rgba(0,200,255,0.1)] border border-[rgba(0,200,255,0.14)] shadow-sm'
                    )}
                    aria-label={voiceState === 'recording' ? '录音中...' : '语音输入'}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </button> */}
                </div>

                <textarea
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  placeholder="在这里输入你的创意文案...

例如：
火箭升空分镜脚本

第一幕：发射准备
运载火箭矗立在发射台上，周围是一片宁静的山谷。晨曦初露，金色的阳光洒在火箭银白色的外壳上...

第二幕：点火升空
倒计时结束，火焰从火箭底部喷涌而出，巨大的轰鸣声响彻山谷..."
                  className="w-full h-[400px] bg-transparent text-[#E8F8FF] text-base leading-relaxed resize-none outline-none placeholder:text-[#2E4F68]"
                />
              </div>
            ) : (
              <div ref={scriptContainerRef} className="min-h-[400px] max-h-[600px] overflow-y-auto">
                {isStreaming && generatedScript.length === 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-[#3BFF5A] animate-pulse shadow-[0_0_6px_rgba(59,255,90,0.5)]" />
                      <span className="text-[#3BFF5A] text-sm font-medium">AI 正在生成剧本...</span>
                    </div>
                    <SceneCardSkeleton />
                    <SceneCardSkeleton />
                  </div>
                ) : generatedScript.length > 0 ? (
                  <div className="space-y-4">
                    {(isStreaming || visibleSceneIndex < generatedScript.length - 1) && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-[#3BFF5A] animate-pulse shadow-[0_0_6px_rgba(59,255,90,0.5)]" />
                        <span className="text-[#3BFF5A] text-sm font-medium">AI 生成中...</span>
                      </div>
                    )}
                    {!isStreaming && visibleSceneIndex >= generatedScript.length - 1 && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-[#3BFF5A] shadow-[0_0_4px_rgba(59,255,90,0.3)]" />
                        <span className="text-[#3BFF5A] text-sm font-medium">已生成 {generatedScript.length} 个场景</span>
                      </div>
                    )}

                    {generatedScript.slice(0, visibleSceneIndex + 1).map((scene, index) => (
                      <SceneCard
                        key={scene.id}
                        scene={scene}
                        isVisible={index <= visibleSceneIndex}
                        onDescriptionChange={handleDescriptionChange}
                        onDelete={handleDeleteScene}
                      />
                    ))}

                    {visibleSceneIndex < generatedScript.length - 1 && (
                      <SceneCardSkeleton />
                    )}
                    {!isStreaming && (
                      <button
                        onClick={handleOpenAddDialog}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-[rgba(0,200,255,0.16)] text-[#6B9AB5] hover:text-[#00C8FF] hover:border-[rgba(0,200,255,0.4)] hover:bg-[rgba(0,200,255,0.06)] transition-all duration-150 text-sm font-medium flex items-center justify-center gap-2 active:scale-95"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        添加场景
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-[rgba(0,200,255,0.06)] flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-[#2E4F68]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <p className="text-[#6B9AB5]">暂无生成的剧本</p>
                      <p className="text-[#2E4F68] text-xs mt-1">在"原始文案"中输入内容后点击"开始创作"</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-4 py-3 border-t border-[rgba(0,200,255,0.12)] bg-[rgba(14,32,60,0.8)]">
            <div className="flex items-center gap-4">
              {activeTab === 'original' ? (
                <>
                  <span className="text-sm text-[#6B9AB5]">{wordCount}字</span>
                  <button
                    onClick={handleStartCreation}
                    disabled={!originalText.trim() || isProcessing}
                    className={cn(
                      'px-6 py-2.5 rounded-xl font-bold transition-all duration-150 active:scale-95',
                      originalText.trim() && !isProcessing
                        ? 'bg-gradient-to-r from-[#00C8FF] to-[#00FFE5] text-[#0a1628] shadow-[0_0_24px_rgba(0,200,255,0.35)] hover:shadow-[0_0_36px_rgba(0,200,255,0.5)] active:shadow-[0_0_48px_rgba(0,200,255,0.6)]'
                        : 'bg-[rgba(0,200,255,0.06)] text-[#2E4F68] cursor-not-allowed'
                    )}
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        AI处理中...
                      </span>
                    ) : (
                      '开始创作'
                    )}
                  </button>
                </>
              ) : (
                <>
                  {isProcessing ? (
                    <button
                      onClick={handleCancelGeneration}
                      className="px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-[#FF6B1A] to-[#FF3D00] text-white transition-all duration-150 shadow-[0_0_20px_rgba(255,107,26,0.35)] hover:shadow-[0_0_32px_rgba(255,107,26,0.5)] active:shadow-[0_0_40px_rgba(255,107,26,0.6)] active:scale-95"
                    >
                      取消生成
                    </button>
                  ) : (
                    <button
                      onClick={handleNextStep}
                      disabled={generatedScript.length === 0}
                      className={cn(
                        'px-6 py-2.5 rounded-xl font-bold transition-all duration-150 active:scale-95',
                        generatedScript.length > 0
                          ? 'bg-gradient-to-r from-[#00C8FF] to-[#00FFE5] text-[#0a1628] shadow-[0_0_24px_rgba(0,200,255,0.35)] hover:shadow-[0_0_36px_rgba(0,200,255,0.5)] active:shadow-[0_0_48px_rgba(0,200,255,0.6)]'
                          : 'bg-[rgba(0,200,255,0.06)] text-[#2E4F68] cursor-not-allowed'
                      )}
                    >
                      下一步：场景设置
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 text-center text-sm text-[#2E4F68]">
          <p>提示：详细的文案描述将帮助AI生成更精准的分镜脚本</p>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除场景「{deleteTarget?.title}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-white hover:bg-destructive/90 shadow-[0_0_20px_rgba(255,61,0,0.3)] hover:shadow-[0_0_32px_rgba(255,61,0,0.45)] active:shadow-[0_0_40px_rgba(255,61,0,0.55)] active:scale-95">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Scene Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加新场景</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="scene-title">场景标题</Label>
              <Input
                id="scene-title"
                value={newSceneTitle}
                onChange={(e) => setNewSceneTitle(e.target.value)}
                placeholder="如：发射准备"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scene-summary">简介</Label>
              <Input
                id="scene-summary"
                value={newSceneSummary}
                onChange={(e) => setNewSceneSummary(e.target.value)}
                placeholder="一句话概括本场景"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scene-location">场景</Label>
              <Input
                id="scene-location"
                value={newSceneLocation}
                onChange={(e) => setNewSceneLocation(e.target.value)}
                placeholder="如：外 山谷中央发射台"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="scene-time">时间</Label>
                <Input
                  id="scene-time"
                  value={newSceneTime}
                  onChange={(e) => setNewSceneTime(e.target.value)}
                  placeholder="如：清晨"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scene-weather">天气</Label>
                <Input
                  id="scene-weather"
                  value={newSceneWeather}
                  onChange={(e) => setNewSceneWeather(e.target.value)}
                  placeholder="如：晴"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scene-characters">出场人物</Label>
              <Input
                id="scene-characters"
                value={newSceneCharacters}
                onChange={(e) => setNewSceneCharacters(e.target.value)}
                placeholder="如：火箭、指挥官"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scene-desc">镜头描述</Label>
              <Textarea
                id="scene-desc"
                value={newSceneDescription}
                onChange={(e) => setNewSceneDescription(e.target.value)}
                placeholder="描述画面内容、运镜、氛围等..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAddScene}>确认添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voice Wave Modal - 音纹浮层 */}
      {showVoiceModal && (
        <VoiceWaveModal
          isVisible={true}
          recognizedText=""  // 音纹框不显示文字，只显示音纹动画
          onStopRecording={handleStopVoice}
        />
    )}
    </div>
  );
}
