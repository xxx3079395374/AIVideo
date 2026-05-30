'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCreation } from '@/lib/store';

export default function HomePage() {
  const router = useRouter();
  
  // 默认重定向到岗位分配页面
  useEffect(() => {
    router.replace('/role');
  }, [router]);
  
  return null;
  const { originalText, setOriginalText, generatedScript, setGeneratedScript, setCurrentStep } = useCreation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [activeTab, setActiveTab] = useState<'original' | 'script'>('original');

  const styles = [
    { id: 'cinematic', name: '电影感', desc: '专业电影镜头语言' },
    { id: 'anime', name: '动漫风格', desc: '日式动画风格' },
    { id: 'documentary', name: '纪录片', desc: '真实纪实风格' },
    { id: 'commercial', name: '广告片', desc: '商业宣传风格' },
  ];

  // TODO: 替换为真实的AI生成接口
  const generateScript = async (text: string) => {
    // 模拟AI生成 - 这里预留接口，后续可替换为真实API调用
    // 示例: const response = await fetch('/api/generate-script', { method: 'POST', body: JSON.stringify({ text, style: selectedStyle }) });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 模拟返回数据
    return [
      { 
        id: '1', 
        sceneNumber: 1, 
        sceneCode: '1-1', 
        title: '发射准备', 
        location: '外景', 
        content: '运载火箭矗立在发射台上，周围是一片宁静的山谷。晨曦初露，金色的阳光洒在火箭银白色的外壳上。',
        summary: '火箭矗立在发射台，等待发射',
        sceneLocation: '山谷中央发射台',
        time: '清晨',
        weather: '晴朗',
        characters: '火箭、发射人员',
        description: '镜头缓缓推进，展现火箭的雄伟姿态。远景转中景，捕捉晨光中的发射场景。'
      },
      { 
        id: '2', 
        sceneNumber: 2, 
        sceneCode: '1-2', 
        title: '倒计时', 
        location: '内景', 
        content: '控制中心内，工作人员紧张有序地进行最后的检查。倒计时显示屏上的数字不断跳动。',
        summary: '控制中心倒计时准备',
        sceneLocation: '控制中心',
        time: '同上',
        weather: '无',
        characters: '控制人员',
        description: '特写镜头：手指敲击键盘、屏幕上的数据跳动、紧张的面部表情。'
      },
      { 
        id: '3', 
        sceneNumber: 3, 
        sceneCode: '2-1', 
        title: '点火升空', 
        location: '外景', 
        content: '倒计时结束，火焰从火箭底部喷涌而出，巨大的轰鸣声响彻山谷。火箭缓缓上升，穿过云层。',
        summary: '火箭点火升空',
        sceneLocation: '山谷发射台',
        time: '清晨',
        weather: '晴朗',
        characters: '火箭',
        description: '慢镜头展示火焰喷射的壮观场面，火箭上升的全景镜头，云层中穿行的特写。'
      },
      { 
        id: '4', 
        sceneNumber: 4, 
        sceneCode: '2-2', 
        title: '进入太空', 
        location: '外景', 
        content: '火箭突破大气层，进入浩瀚的太空。地球在远处渐渐变小的蓝色星球。',
        summary: '火箭进入太空轨道',
        sceneLocation: '太空',
        time: '无',
        weather: '无',
        characters: '火箭、地球',
        description: '广角镜头展现太空的辽阔，火箭从画面一侧穿过，地球作为背景。'
      },
    ];
  };

  const handleStartCreation = async () => {
    if (!originalText.trim()) return;
    
    setIsProcessing(true);
    
    try {
      // 调用AI生成接口
      const scriptData = await generateScript(originalText);
      setGeneratedScript(scriptData);
      
      // 切换到成品剧本标签
      setActiveTab('script');
    } catch (error) {
      console.error('生成失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextStep = () => {
    setCurrentStep('scene');
    router.push('/scene');
  };

  const wordCount = originalText.length;

  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">创作启动</h1>
          <p className="text-gray-400">输入你的创意文案，AI将为你生成专业分镜脚本</p>
        </div>

        {/* Main Editor Card */}
        <div className="bg-[#12172b] rounded-2xl border border-white/10 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">AI自动处理区域</span>
              <div className="flex items-center gap-2 bg-[#1e2642] rounded-lg p-1">
                <button 
                  onClick={() => setActiveTab('original')}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    activeTab === 'original' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'
                  )}
                >
                  原始文案
                </button>
                <button 
                  onClick={() => setActiveTab('script')}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    activeTab === 'script' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'
                  )}
                >
                  成品剧本
                </button>
              </div>
            </div>
          </div>

          {/* Editor Area */}
          <div className="p-4">
            {activeTab === 'original' ? (
              <div className="relative min-h-[400px]">
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
                  className="w-full h-[400px] bg-transparent text-white text-base leading-relaxed resize-none outline-none placeholder:text-gray-600"
                />
              </div>
            ) : (
              <div className="min-h-[400px] max-h-[500px] overflow-y-auto">
                {generatedScript.length > 0 ? (
                  <div className="space-y-3">
                    {generatedScript.map((scene) => (
                      <div key={scene.id} className="bg-[#1a1f2e] rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                            {scene.sceneCode}
                          </span>
                          <span className="text-white font-medium">{scene.title}</span>
                          <span className="text-gray-500 text-sm ml-auto">{scene.location}</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {scene.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-[#1e2642] flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <p className="text-gray-500">暂无生成的剧本</p>
                      <p className="text-gray-600 text-xs mt-1">在"原始文案"中输入内容后点击"开始创作"</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-[#0d1221]/50">
            <button
              onClick={() => setShowStyleModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
              </svg>
              <span>风格</span>
            </button>

            <div className="flex items-center gap-4">
              {activeTab === 'original' ? (
                <>
                  <span className="text-sm text-gray-500">{wordCount}字</span>
                  <button
                    onClick={handleStartCreation}
                    disabled={!originalText.trim() || isProcessing}
                    className={cn(
                      'px-6 py-2 rounded-lg font-medium transition-all duration-200',
                      originalText.trim() && !isProcessing
                        ? 'bg-blue-500 hover:bg-blue-600 text-white glow-blue'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
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
                <button
                  onClick={handleNextStep}
                  disabled={generatedScript.length === 0}
                  className={cn(
                    'px-6 py-2 rounded-lg font-medium transition-all duration-200',
                    generatedScript.length > 0
                      ? 'bg-blue-500 hover:bg-blue-600 text-white glow-blue'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  )}
                >
                  下一步：场景设置
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>提示：详细的文案描述将帮助AI生成更精准的分镜脚本</p>
        </div>
      </div>

      {/* Style Modal */}
      {showStyleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#12172b] rounded-2xl border border-white/10 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">选择创作风格</h3>
            <div className="grid grid-cols-2 gap-3">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={cn(
                    'p-4 rounded-xl border transition-all duration-200 text-left',
                    selectedStyle === style.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/10 hover:border-white/20'
                  )}
                >
                  <div className="font-medium text-white mb-1">{style.name}</div>
                  <div className="text-sm text-gray-400">{style.desc}</div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowStyleModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => setShowStyleModal(false)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
