'use client';

import { cn } from '@/lib/utils';
import type { ScriptScene, Character } from '@/types';

interface CharacterTaskListProps {
  scriptScenes: ScriptScene[];
  drawnCharacters: Character[];
  onSelectCharacter: (characterName: string, sourceScene: ScriptScene) => void;
  selectedCharacterName?: string;
}

export function CharacterTaskList({ 
  scriptScenes, 
  drawnCharacters, 
  onSelectCharacter,
  selectedCharacterName 
}: CharacterTaskListProps) {
  // 提取唯一角色列表（根据角色名称去重）
  const extractUniqueCharacters = (scenes: ScriptScene[]) => {
    const characterSet = new Set<string>();
    const uniqueCharacters: { name: string; sourceScene: ScriptScene }[] = [];
    
    scenes.forEach(scene => {
      if (scene.characters && scene.characters.trim() !== '' && scene.characters !== '无') {
        // 拆分"火箭、发射人员" → ['火箭', '发射人员']
        const chars = scene.characters.split('、').map(c => c.trim()).filter(Boolean);
        
        chars.forEach(charName => {
          // 过滤掉"无"等无效角色名
          if (charName && charName !== '无' && !characterSet.has(charName)) {
            characterSet.add(charName);
            uniqueCharacters.push({
              name: charName,
              sourceScene: scene
            });
          }
        });
      }
    });
    
    return uniqueCharacters;
  };

  const uniqueCharacters = extractUniqueCharacters(scriptScenes);

  // 检查某个角色是否已被绘制
  const getDrawStatus = (characterName: string): { drawn: boolean; character?: Character } => {
    const matchedCharacter = drawnCharacters.find(c => c.name === characterName);
    
    return {
      drawn: !!matchedCharacter,
      character: matchedCharacter,
    };
  };

  // 统计进度
  const completedCount = uniqueCharacters.filter(char => getDrawStatus(char.name).drawn).length;
  const totalCount = uniqueCharacters.length;

  if (uniqueCharacters.length === 0) {
    return (
      <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-2xl border border-[rgba(0,200,255,0.16)] shadow-[0_0_20px_rgba(0,200,255,0.08)] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,200,255,0.12)] bg-gradient-to-r from-[rgba(168,85,247,0.08)] to-[rgba(255,107,26,0.04)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#A855F7] flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.35)]">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="text-[#E8F8FF] font-semibold">待绘制角色</span>
          </div>
        </div>
        {/* 无角色提示 */}
        <div className="px-4 py-8 text-center">
          <p className="text-[#6B9AB5] text-sm">当前剧本中没有检测到角色</p>
          <p className="text-[#6B9AB5] text-sm mt-1">可直接进入下一步</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-2xl border border-[rgba(0,200,255,0.16)] shadow-[0_0_20px_rgba(0,200,255,0.08)] overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,200,255,0.12)] bg-gradient-to-r from-[rgba(168,85,247,0.08)] to-[rgba(255,107,26,0.04)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#A855F7] flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.35)]">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <span className="text-[#E8F8FF] font-semibold">待绘制角色</span>
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
            className="h-full bg-gradient-to-r from-[#A855F7] to-[#FF6B1A] transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.3)]"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 角色列表 */}
      <div className="max-h-[300px] overflow-y-auto">
        {uniqueCharacters.map((charInfo, index) => {
          const { drawn, character } = getDrawStatus(charInfo.name);
          const isSelected = selectedCharacterName === charInfo.name;

          const status = character?.status;
          const isFailed = drawn && status === 'failed';
          const isRejected = drawn && status === 'rejected';
          const isPolishing = drawn && status === 'polishing';
          const isCompleted = drawn && status === 'completed';

          return (
            <button
              key={`${charInfo.name}-${index}`}
              onClick={() => onSelectCharacter(charInfo.name, charInfo.sourceScene)}
              className={cn(
                'w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-150 border-b border-[rgba(0,200,255,0.08)] last:border-b-0',
                isSelected ? 'bg-[rgba(168,85,247,0.1)] border-l-[3px] border-l-[#A855F7]' : 'hover:bg-[rgba(0,200,255,0.04)] border-l-[3px] border-l-transparent',
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
                        ? 'bg-[#A855F7] text-white shadow-[0_0_8px_rgba(168,85,247,0.3)]'
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

              {/* 角色信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium truncate',
                    drawn ? 'text-[#6B9AB5]' : 'text-[#E8F8FF]'
                  )}>
                    {charInfo.name}
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
          💡 点击角色开始绘制，AI 将帮你润色成专业角色图
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
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[rgba(168,85,247,0.15)] to-[rgba(255,107,26,0.1)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_rgba(168,85,247,0.15)]">
          <svg className="w-10 h-10 text-[#A855F7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-[#E8F8FF] mb-2">
          还没有剧本内容
        </h3>
        <p className="text-[#6B9AB5] mb-6">
          请先在「创作启动」模块输入创意文案，<br />
          生成剧本后才能绘制角色
        </p>
        <a
          href="/start"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#A855F7] to-[#FF6B1A] text-white rounded-xl font-bold transition-all duration-150 shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:shadow-[0_0_36px_rgba(168,85,247,0.5)] active:shadow-[0_0_48px_rgba(168,85,247,0.6)] active:scale-95"
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
