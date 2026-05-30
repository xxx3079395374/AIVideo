'use client';

import { cn } from '@/lib/utils';
import type { ScriptScene, Scene } from '@/types';

interface SceneTaskListProps {
  scriptScenes: ScriptScene[];
  drawnScenes: Scene[];
  onSelectScene: (scene: ScriptScene) => void;
  selectedSceneId?: string;
}

export function SceneTaskList({ 
  scriptScenes, 
  drawnScenes, 
  onSelectScene,
  selectedSceneId 
}: SceneTaskListProps) {
  // 生成场景显示名称
  const getSceneDisplayName = (scene: ScriptScene): string => {
    let displayName = scene.sceneLocation || scene.title;
    
    // 添加时间和天气信息（过滤掉"无"、"同上"等无效值）
    const timeInfo = scene.time && scene.time !== '无' && scene.time !== '同上' ? scene.time : '';
    const weatherInfo = scene.weather && scene.weather !== '无' ? scene.weather : '';
    
    if (timeInfo || weatherInfo) {
      const infoParts = [timeInfo, weatherInfo].filter(Boolean);
      displayName += `（${infoParts.join('，')}）`;
    }
    
    return displayName;
  };

  // 检查某个剧本场景是否已被绘制
  const getDrawStatus = (scriptScene: ScriptScene): { drawn: boolean; scene?: Scene } => {
    const displayName = getSceneDisplayName(scriptScene);
    const matchedScene = drawnScenes.find(s => s.name === displayName);
    
    return {
      drawn: !!matchedScene,
      scene: matchedScene,
    };
  };

  // 统计进度
  const completedCount = scriptScenes.filter(scene => getDrawStatus(scene).drawn).length;
  const totalCount = scriptScenes.length;

  if (scriptScenes.length === 0) {
    return null;
  }

  return (
    <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-2xl border border-[rgba(0,200,255,0.16)] shadow-[0_0_20px_rgba(0,200,255,0.08)] overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,200,255,0.12)] bg-gradient-to-r from-[rgba(0,200,255,0.08)] to-[rgba(168,85,247,0.06)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00C8FF] flex items-center justify-center shadow-[0_0_10px_rgba(0,200,255,0.35)]">
            <svg className="w-4 h-4 text-[#0a1628]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <span className="text-[#E8F8FF] font-semibold">待绘制场景</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6B9AB5] font-medium">
            {completedCount}/{totalCount} 已完成
          </span>
          {completedCount === totalCount && totalCount > 0 && (
            <span className="w-6 h-6 rounded-full bg-[#3BFF5A] flex items-center justify-center shadow-[0_0_8px_rgba(59,255,90,0.35)]">
              <svg className="w-3.5 h-3.5 text-[#0a1628]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="px-4 py-3 bg-[rgba(14,32,60,0.4)]">
        <div className="h-2 bg-[rgba(0,200,255,0.08)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00C8FF] to-[#3BFF5A] transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(0,200,255,0.3)]"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 场景列表 */}
      <div className="max-h-[300px] overflow-y-auto">
        {scriptScenes.map((scriptScene, index) => {
          const { drawn, scene } = getDrawStatus(scriptScene);
          const isSelected = selectedSceneId === scriptScene.id;

          const status = scene?.status;
          const isFailed = drawn && status === 'failed';
          const isRejected = drawn && status === 'rejected';
          const isPolishing = drawn && status === 'polishing';
          const isCompleted = drawn && status === 'completed';

          return (
            <button
              key={scriptScene.id}
              onClick={() => onSelectScene(scriptScene)}
              className={cn(
                'w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-150 border-b border-[rgba(0,200,255,0.08)] last:border-b-0',
                isSelected ? 'bg-[rgba(0,200,255,0.1)] border-l-[3px] border-l-[#00C8FF]' : 'hover:bg-[rgba(0,200,255,0.04)] border-l-[3px] border-l-transparent',
                isCompleted && 'bg-[rgba(59,255,90,0.04)]',
                isPolishing && 'bg-[rgba(255,184,0,0.04)]',
                isFailed && 'bg-[rgba(255,61,0,0.04)]',
                isRejected && 'bg-[rgba(255,107,26,0.04)]'
              )}
            >
              {/* 状态图标 */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-medium text-sm transition-all',
                isCompleted || isPolishing
                  ? 'bg-[#3BFF5A] text-[#0a1628] shadow-[0_0_8px_rgba(59,255,90,0.3)]'
                  : isFailed
                    ? 'bg-[#FF3D00] text-white shadow-[0_0_8px_rgba(255,61,0,0.3)]'
                    : isRejected
                      ? 'bg-[#FF6B1A] text-white shadow-[0_0_8px_rgba(255,107,26,0.3)]'
                      : isSelected
                        ? 'bg-[#00C8FF] text-[#0a1628] shadow-[0_0_8px_rgba(0,200,255,0.3)]'
                        : 'bg-[rgba(0,200,255,0.1)] text-[#6B9AB5]'
              )}>
                {isCompleted || isPolishing ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : isFailed ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                ) : isRejected ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2L2 22h20L12 2zM12 18h0" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>

              {/* 场景信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium truncate',
                    drawn ? 'text-[#6B9AB5]' : 'text-[#E8F8FF]'
                  )}>
                    {getSceneDisplayName(scriptScene)}
                  </span>
                  {isCompleted && (
                    <span className="px-2 py-0.5 bg-[rgba(59,255,90,0.12)] text-[#3BFF5A] text-xs rounded-full font-medium border border-[rgba(59,255,90,0.2)]">
                      已润色
                    </span>
                  )}
                  {isPolishing && (
                    <span className="px-2 py-0.5 bg-[rgba(255,184,0,0.12)] text-[#FFB800] text-xs rounded-full font-medium flex items-center gap-1 border border-[rgba(255,184,0,0.2)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800] animate-pulse shadow-[0_0_4px_rgba(255,184,0,0.5)]" />
                      润色中
                    </span>
                  )}
                  {isFailed && (
                    <span className="px-2 py-0.5 bg-[rgba(255,61,0,0.12)] text-[#FF3D00] text-xs rounded-full font-medium border border-[rgba(255,61,0,0.2)]">
                      润色失败
                    </span>
                  )}
                  {isRejected && (
                    <span className="px-2 py-0.5 bg-[rgba(255,107,26,0.12)] text-[#FF6B1A] text-xs rounded-full font-medium border border-[rgba(255,107,26,0.2)]">
                      审核驳回
                    </span>
                  )}
                </div>
              </div>

              {/* 箭头 */}
              {!drawn && (
                <svg className="w-5 h-5 text-[#2E4F68] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-2 bg-[rgba(14,32,60,0.4)] border-t border-[rgba(0,200,255,0.1)]">
        <p className="text-xs text-[#2E4F68] text-center">
          💡 点击场景开始绘制，AI 将帮你润色成专业场景图
        </p>
      </div>
    </div>
  );
}

// 空状态引导组件
export function EmptyScriptGuide() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[rgba(0,200,255,0.15)] to-[rgba(168,85,247,0.12)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_rgba(0,200,255,0.15)]">
          <svg className="w-10 h-10 text-[#00C8FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-[#E8F8FF] mb-2">
          还没有剧本内容
        </h3>
        <p className="text-[#6B9AB5] mb-6">
          请先在「创作启动」模块输入创意文案，<br />
          生成剧本后才能绘制场景
        </p>
        <a
          href="/start"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00C8FF] to-[#00FFE5] text-[#0a1628] rounded-xl font-bold transition-all duration-150 shadow-[0_0_24px_rgba(0,200,255,0.35)] hover:shadow-[0_0_36px_rgba(0,200,255,0.5)] active:shadow-[0_0_48px_rgba(0,200,255,0.6)] active:scale-95"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          去创作启动
        </a>
      </div>
    </div>
  );
}
