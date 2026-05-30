'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCreation } from '@/lib/store';
import { VoiceWaveModal } from '@/components/voice-wave-modal';
import type { RoleAssignment, RoleConfig } from '@/types';

// 岗位配置
const ROLE_CONFIGS: RoleConfig[] = [
  {
    key: 'director',
    label: '导演',
    icon: '🎬',
    description: '负责整体创作方向和视觉呈现',
    relatedStep: 'start',
  },
  {
    key: 'screenwriter',
    label: '编剧',
    icon: '✍️',
    description: '负责剧本创作和内容编写',
    relatedStep: 'script',
  },
  {
    key: 'sceneDesign',
    label: '场景设计',
    icon: '🎨',
    description: '负责场景规划和视觉风格',
    relatedStep: 'scene',
  },
  {
    key: 'characterDesign',
    label: '角色设计',
    icon: '👤',
    description: '负责角色形象和造型设计',
    relatedStep: 'character',
  },
  {
    key: 'storyboard',
    label: '分镜',
    icon: '🖼️',
    description: '负责分镜绘制和镜头设计',
    relatedStep: 'storyboard',
  },
  {
    key: 'editing',
    label: '剪辑',
    icon: '✂️',
    description: '负责视频剪辑和后期制作',
    relatedStep: 'video',
  },
];

// 岗位颜色配置 - 霓虹风格
const ROLE_COLORS: Record<string, { bg: string; light: string; text: string; border: string; accent: string }> = {
  director: { bg: 'bg-[#00C8FF]', light: 'bg-[rgba(0,200,255,0.08)]', text: 'text-[#00C8FF]', border: 'border-[rgba(0,200,255,0.3)]', accent: 'border-l-[3px] border-l-[#00C8FF]' },
  screenwriter: { bg: 'bg-[#3B82F6]', light: 'bg-[rgba(59,130,246,0.08)]', text: 'text-[#3B82F6]', border: 'border-[rgba(59,130,246,0.3)]', accent: 'border-l-[3px] border-l-[#3B82F6]' },
  sceneDesign: { bg: 'bg-[#3BFF5A]', light: 'bg-[rgba(59,255,90,0.08)]', text: 'text-[#3BFF5A]', border: 'border-[rgba(59,255,90,0.3)]', accent: 'border-l-[3px] border-l-[#3BFF5A]' },
  characterDesign: { bg: 'bg-[#A855F7]', light: 'bg-[rgba(168,85,247,0.08)]', text: 'text-[#A855F7]', border: 'border-[rgba(168,85,247,0.3)]', accent: 'border-l-[3px] border-l-[#A855F7]' },
  storyboard: { bg: 'bg-[#FF6B1A]', light: 'bg-[rgba(255,107,26,0.08)]', text: 'text-[#FF6B1A]', border: 'border-[rgba(255,107,26,0.3)]', accent: 'border-l-[3px] border-l-[#FF6B1A]' },
  editing: { bg: 'bg-[#FFB800]', light: 'bg-[rgba(255,184,0,0.08)]', text: 'text-[#FFB800]', border: 'border-[rgba(255,184,0,0.3)]', accent: 'border-l-[3px] border-l-[#FFB800]' },
};

// 语音识别状态类型
type VoiceInputState = 'idle' | 'recording' | 'recognizing' | 'success' | 'error';

// 语音确认弹窗状态
interface VoiceConfirmDialog {
  show: boolean;
  result: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// 错误提示弹窗状态
interface ErrorDialog {
  show: boolean;
  title: string;
  message: string;
  onRetry?: () => void;
  onCancel: () => void;
}

export default function RoleAssignmentPage() {
  const router = useRouter();
  const { roleAssignment, setRoleAssignment, setCurrentStep } = useCreation();
  
  const [formData, setFormData] = useState<RoleAssignment>({
    director: '',
    screenwriter: '',
    sceneDesign: '',
    characterDesign: '',
    storyboard: '',
    editing: '',
  });
  
  const [singleMode, setSingleMode] = useState(false);
  const [singleName, setSingleName] = useState('');

  // 语音输入状态
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'recognizing' | 'success' | 'error'>('idle');
  const [voiceResult, setVoiceResult] = useState('');
  const [interimResult, setInterimResult] = useState('');
  const [currentVoiceField, setCurrentVoiceField] = useState<keyof RoleAssignment | 'singleName' | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false); // 控制音纹浮层显示
  
  // 使用 ref 存储 recognition 实例，避免状态更新导致重建
  const recognitionRef = useRef<any>(null);
  
  const [confirmDialog, setConfirmDialog] = useState<VoiceConfirmDialog>({
    show: false,
    result: '',
    onConfirm: () => {},
    onCancel: () => {},
  });
  const [errorDialog, setErrorDialog] = useState<ErrorDialog>({
    show: false,
    title: '',
    message: '',
    onRetry: undefined,
    onCancel: () => {},
  });

  useEffect(() => {
    if (roleAssignment) {
      setFormData(roleAssignment);
    }
  }, [roleAssignment]);

  useEffect(() => {
    if (singleMode && singleName.trim()) {
      setFormData({
        director: singleName,
        screenwriter: singleName,
        sceneDesign: singleName,
        characterDesign: singleName,
        storyboard: singleName,
        editing: singleName,
      });
    }
  }, [singleMode, singleName]);

  const handleInputChange = (key: keyof RoleAssignment, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // 初始化语音识别（只运行一次）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition && !recognitionRef.current) {
        const rec = new SpeechRecognition();
        rec.lang = 'zh-CN';
        rec.continuous = false;
        rec.interimResults = true;

        rec.onstart = () => {
          console.log('语音识别已启动');
          setVoiceState('recording');
          setInterimResult('');
        };

        rec.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          if (final) {
            setInterimResult(final);
          } else {
            setInterimResult(interim);
          }
        };

        rec.onend = () => {
          console.log('语音识别已结束，当前状态:', voiceState);
          if (voiceState === 'recording') {
            setVoiceState('recognizing');
            // 延迟调用处理，确保状态更新完成
            setTimeout(() => {
              handleStopVoice();
            }, 100);
          }
        };

        rec.onerror = (event: any) => {
          console.error('语音识别错误:', event.error);
          // 忽略 aborted 错误，这是正常的停止行为
          if (event.error === 'aborted') {
            console.log('语音识别已被中止（正常停止）');
            return;
          }
          
          let errorMessage = '语音识别失败，请重试';
          
          switch (event.error) {
            case 'not-allowed':
              errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许';
              break;
            case 'no-speech':
              errorMessage = '未检测到语音，请确保麦克风正常工作';
              break;
            case 'network':
              errorMessage = '网络连接失败，请检查网络';
              break;
            case 'audio-capture':
              errorMessage = '无法捕获音频，请检查麦克风设备';
              break;
          }
          
          setVoiceState('error');
          setErrorDialog({
            show: true,
            title: '⚠️ 识别失败',
            message: errorMessage,
            onRetry: () => {
              setErrorDialog({ show: false, title: '', message: '', onCancel: () => {} });
              startVoiceRecognition(currentVoiceField!);
            },
            onCancel: () => {
              setErrorDialog({ show: false, title: '', message: '', onCancel: () => {} });
              setVoiceState('idle');
            },
          });
        };

        recognitionRef.current = rec;
      }
    }

    // 清理函数
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []); // ✅ 空依赖数组，只运行一次

  // 开始语音识别
  const startVoiceRecognition = (field: keyof RoleAssignment | 'singleName') => {
    const rec = recognitionRef.current;
    
    if (!rec) {
      setErrorDialog({
        show: true,
        title: '⚠️ 不支持语音输入',
        message: '您的浏览器不支持语音输入功能，请使用 Chrome 浏览器。',
        onCancel: () => {
          setErrorDialog({ show: false, title: '', message: '', onCancel: () => {} });
        },
      });
      return;
    }

    // 如果正在录音，先停止
    if (voiceState === 'recording') {
      try {
        rec.abort();
      } catch (error) {
        console.error('停止语音识别失败:', error);
      }
    }

    // 等待一下再开始新的录音
    setTimeout(() => {
      setCurrentVoiceField(field);
      setVoiceResult('');
      setInterimResult('');
      setShowVoiceModal(true); // 显示音纹浮层
      
      try {
        rec.start();
      } catch (error) {
        console.error('启动语音识别失败:', error);
        setShowVoiceModal(false); // 关闭音纹浮层
        setErrorDialog({
          show: true,
          title: '⚠️ 启动失败',
          message: '语音识别启动失败，请重试。',
          onRetry: () => {
            setErrorDialog({ show: false, title: '', message: '', onCancel: () => {} });
            startVoiceRecognition(field);
          },
          onCancel: () => {
            setErrorDialog({ show: false, title: '', message: '', onCancel: () => {} });
          },
        });
      }
    }, 100);
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

    // 关闭音纹浮层
    setShowVoiceModal(false);

    // 延迟处理结果，等待识别完成
    setTimeout(() => {
      // 清理末尾标点符号
      const result = interimResult.trim().replace(/[。，、！？；：""''《》【】（）\s]+$/, '');
      if (result && result.length > 0 && result.length <= 10) {
        // 简单验证：长度1-10个字符
        setVoiceResult(result);
        setConfirmDialog({
          show: true,
          result: result,
          onConfirm: () => {
            if (currentVoiceField === 'singleName') {
              setSingleName(result);
            } else {
              handleInputChange(currentVoiceField as keyof RoleAssignment, result);
            }
            setConfirmDialog({ show: false, result: '', onConfirm: () => {}, onCancel: () => {} });
            setVoiceState('success');
            setTimeout(() => setVoiceState('idle'), 1000);
          },
          onCancel: () => {
            setConfirmDialog({ show: false, result: '', onConfirm: () => {}, onCancel: () => {} });
            setVoiceState('idle');
            setInterimResult(''); // 清空识别结果
            setShowVoiceModal(true); // 重新显示音纹浮层
            setTimeout(() => {
              startVoiceRecognition(currentVoiceField!); // 延迟500ms后自动开始录音
            }, 500);
          },
        });
      } else if (result) {
        setErrorDialog({
          show: true,
          title: '⚠️ 未识别到有效姓名',
          message: `识别结果："${result}" 不是有效的姓名，请重新说出姓名。`,
          onRetry: () => {
            setErrorDialog({ show: false, title: '', message: '', onCancel: () => {} });
            setVoiceState('idle');
            setInterimResult(''); // 清空识别结果
            setShowVoiceModal(true); // 重新显示音纹浮层
            setTimeout(() => {
              startVoiceRecognition(currentVoiceField!); // 延迟500ms后自动开始录音
            }, 500);
          },
          onCancel: () => {
            setErrorDialog({ show: false, title: '', message: '', onCancel: () => {} });
            setVoiceState('idle');
          },
        });
      } else {
        setErrorDialog({
          show: true,
          title: '⚠️ 未检测到语音',
          message: '请确保麦克风正常工作，并大声清晰地说出姓名。',
          onRetry: () => {
            setErrorDialog({ show: false, title: '', message: '', onCancel: () => {} });
            setVoiceState('idle');
            setInterimResult(''); // 清空识别结果
            setShowVoiceModal(true); // 重新显示音纹浮层
            setTimeout(() => {
              startVoiceRecognition(currentVoiceField!); // 延迟500ms后自动开始录音
            }, 500);
          },
          onCancel: () => {
            setErrorDialog({ show: false, title: '', message: '', onCancel: () => {} });
            setVoiceState('idle');
          },
        });
      }
    }, 500);
  };

  // 手动停止录音
  const handleManualStop = () => {
    const rec = recognitionRef.current;
    if (rec && voiceState === 'recording') {
      try {
        rec.stop();
      } catch (error) {
        console.error('停止语音识别失败:', error);
      }
    }
  };

  // 获取麦克风按钮样式
  const getMicButtonClass = () => {
    const baseClass = 'p-2 rounded-lg transition-all duration-200';
    
    switch (voiceState) {
      case 'recording':
        return `${baseClass} bg-[rgba(0,200,255,0.12)] text-[#00C8FF] border-2 border-[#00C8FF] animate-pulse shadow-[0_0_8px_rgba(0,200,255,0.3)]`;
      case 'recognizing':
        return `${baseClass} bg-[rgba(168,85,247,0.12)] text-[#A855F7] border-2 border-[#A855F7] shadow-[0_0_8px_rgba(168,85,247,0.3)]`;
      case 'success':
        return `${baseClass} bg-[rgba(59,255,90,0.12)] text-[#3BFF5A] border-2 border-[#3BFF5A] shadow-[0_0_8px_rgba(59,255,90,0.3)]`;
      case 'error':
        return `${baseClass} bg-[rgba(255,107,26,0.12)] text-[#FF6B1A] border-2 border-[#FF6B1A] shadow-[0_0_8px_rgba(255,107,26,0.3)]`;
      default:
        return `${baseClass} bg-[rgba(0,200,255,0.07)] text-[#2E4F68] border-2 border-[rgba(0,200,255,0.12)] hover:bg-[rgba(0,200,255,0.08)] hover:text-[#6B9AB5]`;
    }
  };

  const handleNext = () => {
    setRoleAssignment(formData);
    setCurrentStep('start');
    router.push('/start');
  };

  const handleSkip = () => {
    setCurrentStep('start');
    router.push('/start');
  };

  const filledCount = Object.values(formData).filter(v => v.trim()).length;
  const isAllFilled = filledCount === 6;

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#E8F8FF] mb-2 tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>岗位分配</h1>
          <p className="text-[#6B9AB5]">为创作团队分配岗位，明确各环节负责人</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-[rgba(20,44,76,0.9)] backdrop-blur-sm rounded-xl p-1.5 border border-[rgba(0,200,255,0.2)] shadow-[0_0_24px_rgba(0,200,255,0.06)] inline-flex">
            <button
              onClick={() => setSingleMode(false)}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95',
                !singleMode ? 'bg-[#00C8FF] text-[#0a1628] shadow-[0_0_16px_rgba(0,200,255,0.4)] active:shadow-[0_0_28px_rgba(0,200,255,0.55)]' : 'text-[#2E4F68] hover:text-[#6B9AB5]'
              )}
            >
              团队模式
            </button>
            <button
              onClick={() => setSingleMode(true)}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95',
                singleMode ? 'bg-[#00C8FF] text-[#0a1628] shadow-[0_0_16px_rgba(0,200,255,0.4)] active:shadow-[0_0_28px_rgba(0,200,255,0.55)]' : 'text-[#2E4F68] hover:text-[#6B9AB5]'
              )}
            >
              单人模式
            </button>
          </div>
        </div>

        {/* Single Mode Input */}
        {singleMode && (
          <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-sm rounded-2xl border border-[rgba(0,200,255,0.16)] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_24px_rgba(0,200,255,0.04)] p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[rgba(0,200,255,0.1)] border border-[rgba(0,200,255,0.2)] flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-[#6B9AB5] mb-1.5 font-medium">创作者姓名</label>
                <div className="relative">
                  <input
                    type="text"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    placeholder="输入你的名字，将自动分配到所有岗位"
                    className={cn(
                      'w-full bg-[rgba(0,200,255,0.07)] border rounded-xl px-4 py-3 pr-12 text-[#E8F8FF] placeholder:text-[#2E4F68] focus:ring-2 focus:outline-none transition-all duration-300',
                      voiceState === 'recording' ? 'border-[#00C8FF] focus:border-[#00C8FF] focus:ring-[rgba(0,200,255,0.15)]' : 'border-[rgba(0,200,255,0.12)] focus:border-[#00C8FF] focus:ring-[rgba(0,200,255,0.15)]'
                    )}
                  />
                  {/* <button
                    onClick={() => {
                      if (voiceState === 'recording') {
                        handleManualStop();
                      } else {
                        startVoiceRecognition('singleName');
                      }
                    }}
                    className={cn(
                      'absolute right-2 top-1/2 -translate-y-1/2',
                      getMicButtonClass()
                    )}
                    aria-label={voiceState === 'recording' ? '停止录音' : '开始语音输入'}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </button> */}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Role Cards */}
        {!singleMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {ROLE_CONFIGS.map((role) => {
              const colors = ROLE_COLORS[role.key];
              const isFilled = formData[role.key].trim();
              
              return (
                <div
                  key={role.key}
                  className={cn(
                    'rounded-xl border p-5 transition-all duration-300',
                    isFilled
                      ? cn(colors.border, colors.accent, 'bg-gradient-to-b from-[rgba(28,58,98,0.94)] to-[rgba(22,48,84,0.92)] backdrop-blur-sm shadow-[0_0_32px_rgba(0,200,255,0.15)] hover:shadow-[0_0_48px_rgba(0,200,255,0.28)] hover:-translate-y-0.5')
                      : 'bg-[rgba(20,44,76,0.86)] border-[rgba(0,200,255,0.2)] hover:border-[rgba(0,200,255,0.35)] hover:bg-[rgba(24,50,84,0.88)]'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                      colors.light
                    )}>
                      <span className="text-2xl">{role.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn('font-semibold', isFilled ? colors.text : 'text-[#E8F8FF]')}>{role.label}</h3>
                        {isFilled && (
                          <span className="w-5 h-5 rounded-full bg-[#3BFF5A] flex items-center justify-center shadow-[0_0_8px_rgba(59,255,90,0.4)]">
                            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#6B9AB5] mb-3">{role.description}</p>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData[role.key]}
                          onChange={(e) => handleInputChange(role.key, e.target.value)}
                          placeholder={`输入${role.label}姓名`}
                          className={cn(
                            'w-full bg-[rgba(0,200,255,0.07)] border rounded-xl px-3 py-2.5 pr-10 text-sm text-[#E8F8FF] placeholder:text-[#2E4F68] focus:ring-2 focus:outline-none transition-all duration-300',
                            voiceState === 'recording' && currentVoiceField === role.key ? 'border-[#00C8FF] focus:border-[#00C8FF] focus:ring-[rgba(0,200,255,0.15)]' : 'border-[rgba(0,200,255,0.12)] focus:border-[#00C8FF] focus:ring-[rgba(0,200,255,0.15)]'
                          )}
                        />
                        {/* <button
                          onClick={() => {
                            if (voiceState === 'recording' && currentVoiceField === role.key) {
                              handleManualStop();
                            } else {
                              startVoiceRecognition(role.key);
                            }
                          }}
                          className={cn(
                            'absolute right-2 top-1/2 -translate-y-1/2',
                            getMicButtonClass()
                          )}
                          aria-label={voiceState === 'recording' && currentVoiceField === role.key ? '停止录音' : '开始语音输入'}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                          </svg>
                        </button> */}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-sm rounded-xl border border-[rgba(0,200,255,0.16)] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_24px_rgba(0,200,255,0.04)] p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[rgba(0,200,255,0.1)] border border-[rgba(0,200,255,0.2)] flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <p className="text-[#E8F8FF] font-semibold">团队配置</p>
                <p className="text-sm text-[#6B9AB5]">
                  {singleMode 
                    ? (singleName.trim() ? `单人创作: ${singleName}` : '请输入创作者姓名')
                    : `已分配 ${filledCount}/6 个岗位`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full transition-colors',
                    (singleMode ? singleName.trim() : i < filledCount)
                      ? 'bg-[#3BFF5A] shadow-[0_0_4px_rgba(59,255,90,0.3)]'
                      : 'bg-[rgba(0,200,255,0.1)]'
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-[#2E4F68] hover:text-[#6B9AB5] transition-all duration-150 active:scale-95 font-medium"
          >
            跳过此步骤
          </button>
          <button
            onClick={handleNext}
            disabled={singleMode ? !singleName.trim() : !isAllFilled}
            className={cn(
              'px-8 py-3 rounded-xl font-medium transition-all duration-150 active:scale-95',
              (singleMode ? singleName.trim() : isAllFilled)
                ? 'bg-gradient-to-r from-[#00C8FF] to-[#00FFE5] text-[#0a1628] font-bold shadow-[0_0_24px_rgba(0,200,255,0.35)] hover:shadow-[0_0_36px_rgba(0,200,255,0.5)] active:shadow-[0_0_48px_rgba(0,200,255,0.6)] hover:-translate-y-0.5'
                : 'bg-[rgba(0,200,255,0.06)] text-[#2E4F68] cursor-not-allowed'
            )}
          >
            开始剧本创作
          </button>
        </div>

        {/* Tips */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#2E4F68]">
            💡 提示：岗位信息将在各创作页面顶部显示，方便团队协作。支持语音输入，点击🎤按钮即可说出姓名。
          </p>
        </div>
      </div>

      {/* 语音确认弹窗 */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[rgba(22,48,84,0.96)] rounded-2xl border border-[rgba(0,200,255,0.14)] shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_60px_rgba(0,200,255,0.05)] max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[rgba(59,255,90,0.12)] border border-[rgba(59,255,90,0.3)] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(59,255,90,0.2)]">
                <svg className="w-6 h-6 text-[#3BFF5A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#E8F8FF]">识别成功</h3>
                <p className="text-sm text-[#6B9AB5]">请确认识别结果</p>
              </div>
            </div>
            <div className="bg-[rgba(0,200,255,0.07)] border border-[rgba(0,200,255,0.08)] rounded-xl p-4 mb-6">
              <p className="text-sm text-[#6B9AB5] mb-1">识别结果：</p>
              <p className="text-xl font-semibold text-[#E8F8FF]">{confirmDialog.result}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmDialog.onCancel}
                className="flex-1 px-4 py-3 border border-[rgba(0,200,255,0.14)] text-[#6B9AB5] rounded-xl hover:bg-[rgba(0,200,255,0.06)] hover:text-[#E8F8FF] transition-all duration-150 active:scale-95 font-medium"
              >
                重新输入
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#00C8FF] to-[#00FFE5] text-[#0a1628] font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,200,255,0.4)] active:shadow-[0_0_32px_rgba(0,200,255,0.55)] transition-all duration-150 active:scale-95 hover:-translate-y-0.5"
              >
                确认使用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示弹窗 */}
      {errorDialog.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[rgba(22,48,84,0.96)] rounded-2xl border border-[rgba(0,200,255,0.14)] shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_60px_rgba(0,200,255,0.05)] max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[rgba(255,107,26,0.12)] border border-[rgba(255,107,26,0.3)] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(255,107,26,0.2)]">
                <svg className="w-6 h-6 text-[#FF6B1A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#E8F8FF]">{errorDialog.title}</h3>
              </div>
            </div>
            <p className="text-[#6B9AB5] mb-6">{errorDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={errorDialog.onCancel}
                className="flex-1 px-4 py-3 border border-[rgba(0,200,255,0.14)] text-[#6B9AB5] rounded-xl hover:bg-[rgba(0,200,255,0.06)] hover:text-[#E8F8FF] transition-all duration-150 active:scale-95 font-medium"
              >
                取消
              </button>
              {errorDialog.onRetry && (
                <button
                  onClick={() => {
                    errorDialog.onRetry?.();
                    setErrorDialog({ show: false, title: '', message: '', onCancel: () => {} });
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#FF6B1A] to-[#FF3D00] text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,107,26,0.4)] active:shadow-[0_0_32px_rgba(255,107,26,0.55)] transition-all duration-150 active:scale-95 hover:-translate-y-0.5"
                >
                  重试
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Wave Modal - 音纹浮层 */}
      {showVoiceModal && (
        <VoiceWaveModal
          isVisible={true}
          recognizedText={interimResult.trim().replace(/[。，、！？；：""''《》【】（）\s]+$/, '')}
          onStopRecording={handleStopVoice}
        />
      )}
    </div>
  );
}
