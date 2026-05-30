'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { VoiceWaveModal } from '@/components/voice-wave-modal';
import type { ScriptScene } from '@/types';

interface SceneCardProps {
  scene: ScriptScene;
  isVisible: boolean;
  onDescriptionChange: (id: string, description: string) => void;
  onDelete?: (id: string) => void;
}

// 打字机效果 Hook
function useTypewriter(text: string, speed: number = 20, start: boolean = true) {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    if (!start || !text) {
      setDisplayText('');
      return;
    }
    
    let index = 0;
    setDisplayText('');
    
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    
    return () => clearInterval(timer);
  }, [text, speed, start]);
  
  return displayText;
}

// 单行打字机效果 Hook
function useLineTypewriter(text: string, speed: number = 30, start: boolean = true) {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    if (!start || !text) {
      setDisplayText('');
      return;
    }
    
    let index = 0;
    setDisplayText('');
    
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    
    return () => clearInterval(timer);
  }, [text, speed, start]);
  
  return displayText;
}

export function SceneCard({ scene, isVisible, onDescriptionChange, onDelete }: SceneCardProps) {
  const [showFramework, setShowFramework] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showScene, setShowScene] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [localDescription, setLocalDescription] = useState('');
  
  // 语音识别相关状态
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'recognizing' | 'success' | 'error'>('idle');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showMicHint, setShowMicHint] = useState(false);
  const cursorPositionRef = useRef(0);
  const baseTextRef = useRef('');
  const accumulatedTextRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const titleText = useLineTypewriter(scene.title, 50, showTitle);
  
  useEffect(() => {
    if (scene.description) {
      setLocalDescription(scene.description);
    }
  }, [scene.description]);
  
  useEffect(() => {
    if (!isVisible) return;
    
    const timers = [
      setTimeout(() => setShowFramework(true), 0),
      setTimeout(() => setShowTitle(true), 200),
      setTimeout(() => setShowTags(true), 400),
      setTimeout(() => setShowSummary(true), 600),
      setTimeout(() => setShowScene(true), 800),
      setTimeout(() => setShowCharacters(true), 1000),
      setTimeout(() => setShowDescription(true), 1200),
    ];
    
    return () => timers.forEach(clearTimeout);
  }, [isVisible]);
  
  const handleDescriptionBlur = () => {
    if (localDescription !== scene.description) {
      onDescriptionChange(scene.id, localDescription);
    }
    // 失焦时隐藏麦克风提示
    setTimeout(() => {
      setShowMicHint(false);
    }, 500); 
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

    // 保存开始录音时的基础文本和光标位置
    baseTextRef.current = localDescription;
    accumulatedTextRef.current = '';
    cursorPositionRef.current = textareaRef.current?.selectionStart || 0;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onstart = () => {
        setVoiceState('recording');
        setShowVoiceModal(true);
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
          // 将识别结果插入到光标位置
          const cursorPos = cursorPositionRef.current;
          const newText = 
            baseTextRef.current.slice(0, cursorPos) + 
            accumulatedTextRef.current + 
            baseTextRef.current.slice(cursorPos);
          setLocalDescription(newText);
          resetTimeout();
        }
      };

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        if (event.error !== 'aborted') {
          setVoiceState('error');
          setTimeout(() => {
            setVoiceState('idle');
            setShowVoiceModal(false);
          }, 2000);
        }
      };

      recognition.onend = () => {
        if (voiceState === 'recording') {
          // 正常停止
          handleDescriptionBlur(); // 保存修改
        }
        setVoiceState('idle');
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
    setShowMicHint(false);
  };
  
  // 处理 textarea 聚焦
  const handleTextareaFocus = () => {
    setShowMicHint(true);
    cursorPositionRef.current = textareaRef.current?.selectionStart || 0;
  };
  
  // 处理光标位置变化
  const handleSelect = () => {
    cursorPositionRef.current = textareaRef.current?.selectionStart || 0;
  };
  
  if (!showFramework) {
    return null;
  }
  
  return (
    <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-2xl border border-[rgba(0,200,255,0.16)] shadow-[0_0_20px_rgba(0,200,255,0.08)] overflow-hidden transition-all duration-300 hover:shadow-[0_0_32px_rgba(0,200,255,0.16)] hover:-translate-y-0.5">
      {/* 顶部标题区 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,200,255,0.12)] bg-gradient-to-r from-[rgba(14,32,60,0.8)] to-[rgba(22,48,84,0.6)]">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-[#00C8FF] text-[#0a1628] text-sm font-bold flex items-center justify-center shadow-[0_0_10px_rgba(0,200,255,0.35)]">
            {scene.sceneNumber}
          </span>
          <span className="text-[#E8F8FF] font-medium">
            {titleText}
            {showTitle && titleText.length < (scene.title?.length || 0) && (
              <span className="inline-block w-0.5 h-4 bg-[#00C8FF] animate-pulse ml-0.5 shadow-[0_0_4px_rgba(0,200,255,0.5)]" />
            )}
          </span>
        </div>
        {showTags && (
          <div className="hidden md:flex items-center gap-2">
            {scene.time && (
              <span className="px-2.5 py-1 bg-[rgba(168,85,247,0.15)] text-[#A855F7] text-xs rounded-full font-medium border border-[rgba(168,85,247,0.25)]">
                {scene.time}
              </span>
            )}
            {scene.weather && (
              <span className="px-2.5 py-1 bg-[rgba(0,200,255,0.12)] text-[#00C8FF] text-xs rounded-full font-medium border border-[rgba(0,200,255,0.2)]">
                {scene.weather}
              </span>
            )}
            {scene.sceneLocation && (
              <span className="px-2.5 py-1 bg-[rgba(255,184,0,0.12)] text-[#FFB800] text-xs rounded-full font-medium border border-[rgba(255,184,0,0.2)]">
                {scene.sceneLocation}
              </span>
            )}
          </div>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(scene.id);
            }}
            className="ml-2 p-1.5 rounded-lg text-[#2E4F68] hover:text-[#FF3D00] hover:bg-[rgba(255,61,0,0.1)] transition-all duration-150 active:scale-90"
            title="删除此场景"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        )}
      </div>

      {/* 人物标签 */}
      {showTags && scene.characters && (
        <div className="px-4 py-2 border-b border-[rgba(0,200,255,0.1)] bg-[rgba(14,32,60,0.4)]">
          <span className="px-2.5 py-1 bg-[rgba(0,200,255,0.08)] text-[#B8D8F0] text-xs rounded-full font-medium">
            👥 {scene.characters}
          </span>
        </div>
      )}

      {/* 内容区域 */}
      <div className="p-4 space-y-3">
        {/* 简介 */}
        {showSummary && scene.summary && (
          <div className="flex gap-3">
            <span className="text-[#6B9AB5] text-sm w-12 shrink-0">简介</span>
            <span className="text-[#B8D8F0] text-sm">{scene.summary}</span>
          </div>
        )}

        {/* 场景 */}
        {showScene && (scene.sceneLocation || scene.time || scene.weather) && (
          <div className="flex gap-3">
            <span className="text-[#6B9AB5] text-sm w-12 shrink-0">场景</span>
            <div className="flex flex-wrap gap-2">
              {scene.sceneLocation && (
                <span className="text-[#B8D8F0] text-sm">{scene.sceneLocation}</span>
              )}
              {scene.time && (
                <span className="text-[#6B9AB5] text-sm">· {scene.time}</span>
              )}
              {scene.weather && (
                <span className="text-[#6B9AB5] text-sm">· {scene.weather}</span>
              )}
            </div>
          </div>
        )}

        {/* 人物 */}
        {showCharacters && scene.characters && (
          <div className="flex gap-3">
            <span className="text-[#6B9AB5] text-sm w-12 shrink-0">人物</span>
            <span className="text-[#B8D8F0] text-sm">{scene.characters}</span>
          </div>
        )}

        {/* 镜头描述 - 可编辑输入框 */}
        {showDescription && (
          <div className="flex gap-3">
            <span className="text-[#6B9AB5] text-sm w-12 shrink-0 pt-2">镜头</span>
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                onFocus={handleTextareaFocus}
                onSelect={handleSelect}
                onBlur={handleDescriptionBlur}
                placeholder="请输入镜头描述..."
                className="w-full min-h-[80px] bg-[rgba(0,200,255,0.04)] text-[#E8F8FF] text-sm leading-relaxed rounded-xl p-3 border border-[rgba(0,200,255,0.12)] focus:border-[#00C8FF] focus:ring-2 focus:ring-[rgba(0,200,255,0.15)] focus:outline-none resize-none transition-all placeholder:text-[#2E4F68]"
              />

              {/* 麦克风提示 - 聚焦时显示在右下角 */}
              {/*showMicHint && voiceState !== 'recording' && (
                <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-[rgba(22,48,84,0.95)] px-3 py-1.5 rounded-lg shadow-md border border-[rgba(0,200,255,0.16)] z-10">
                  <span className="text-sm text-[#B8D8F0]">从光标处追加</span>
                  <button
                    onClick={startVoiceRecognition}
                    className={cn(
                      'p-1.5 rounded-lg transition-all duration-150',
                      voiceState === 'idle'
                        ? 'bg-[rgba(0,200,255,0.15)] text-[#00C8FF] hover:bg-[rgba(0,200,255,0.25)]'
                        : 'bg-[rgba(0,200,255,0.06)] text-[#2E4F68] cursor-not-allowed'
                    )}
                    aria-label="语音输入"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </button>
                </div>
              )*/}

              <p className="text-[#2E4F68] text-xs mt-1.5">此描述将用于分镜生成的提示词</p>
            </div>
          </div>
        )}
      </div>
      
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

// 骨架卡片组件（用于加载状态）
export function SceneCardSkeleton() {
  return (
    <div className="bg-[rgba(22,48,84,0.6)] rounded-2xl border border-[rgba(0,200,255,0.1)] overflow-hidden animate-pulse">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,200,255,0.08)] bg-[rgba(14,32,60,0.4)]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[rgba(0,200,255,0.1)]" />
          <div className="w-32 h-4 bg-[rgba(0,200,255,0.08)] rounded" />
        </div>
        <div className="flex gap-2">
          <div className="w-12 h-5 bg-[rgba(0,200,255,0.08)] rounded-full" />
          <div className="w-12 h-5 bg-[rgba(0,200,255,0.08)] rounded-full" />
          <div className="w-16 h-5 bg-[rgba(0,200,255,0.08)] rounded-full" />
        </div>
      </div>
      <div className="px-4 py-2 border-b border-[rgba(0,200,255,0.08)] bg-[rgba(14,32,60,0.2)]">
        <div className="w-16 h-5 bg-[rgba(0,200,255,0.08)] rounded-full" />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="w-12 h-4 bg-[rgba(0,200,255,0.08)] rounded" />
          <div className="w-48 h-4 bg-[rgba(0,200,255,0.08)] rounded" />
        </div>
        <div className="flex gap-3">
          <div className="w-12 h-4 bg-[rgba(0,200,255,0.08)] rounded" />
          <div className="w-32 h-4 bg-[rgba(0,200,255,0.08)] rounded" />
        </div>
        <div className="flex gap-3">
          <div className="w-12 h-4 bg-[rgba(0,200,255,0.08)] rounded" />
          <div className="w-full h-16 bg-[rgba(0,200,255,0.08)] rounded" />
        </div>
      </div>
    </div>
  );
}
