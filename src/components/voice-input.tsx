'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { VoiceWaveModal } from '@/components/voice-wave-modal';

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function VoiceInput({
  value,
  onChange,
  placeholder = '输入提示词...',
  rows = 2,
  className = ''
}: VoiceInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'recognizing' | 'success' | 'error'>('idle');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showMicHint, setShowMicHint] = useState(false);
  const cursorPositionRef = useRef(0);
  const baseTextRef = useRef('');
  const accumulatedTextRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 60秒超时检测
  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (voiceState === 'recording') {
        handleStopVoice();
      }
    }, 60000);
  };

  // 开始语音识别
  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能，请使用 Chrome 浏览器。');
      return;
    }

    // 保存开始录音时的基础文本和光标位置
    baseTextRef.current = value;
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
          onChange(newText);
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
          if (accumulatedTextRef.current) {
            // 有识别结果，已经通过 onChange 更新
          }
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

  // 处理失焦
  const handleBlur = () => {
    // 延迟隐藏，避免点击麦克风按钮时立即消失
    setTimeout(() => {
      setShowMicHint(false);
    }, 500);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleTextareaFocus}
        onSelect={handleSelect}
        onBlur={handleBlur}
        rows={rows}
        className={cn(
          'w-full bg-[rgba(0,200,255,0.04)] border border-[rgba(0,200,255,0.12)] rounded-xl px-3 py-2 text-sm text-[#E8F8FF] placeholder-[#2E4F68] focus:border-[#FF6B1A] focus:outline-none focus:ring-2 focus:ring-[rgba(255,107,26,0.15)] transition-all resize-none',
          className
        )}
        placeholder={placeholder}
      />
      
      {/* 麦克风提示 - 聚焦时显示在右下角 */}
      {/*showMicHint && voiceState !== 'recording' && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white/95 px-3 py-1.5 rounded-lg shadow-md border border-gray-200 z-10">
          <span className="text-sm text-gray-600">语音输入</span>
          <button
            onClick={startVoiceRecognition}
            className={cn(
              'p-1.5 rounded-lg transition-all duration-200',
              voiceState === 'idle'
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
      
      {/* Voice Wave Modal - 音纹浮层 */}
      {showVoiceModal && (
        <VoiceWaveModal
          isVisible={true}
          recognizedText=""
          onStopRecording={handleStopVoice}
        />
      )}
    </div>
  );
}
