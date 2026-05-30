'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCreation } from '@/lib/store';

const TEAM_ROLES = [
  { key: 'director' as const, label: '导演', icon: '🎬' },
  { key: 'screenwriter' as const, label: '编剧', icon: '✍️' },
  { key: 'sceneDesign' as const, label: '场景设计', icon: '🎨' },
  { key: 'characterDesign' as const, label: '角色设计', icon: '👤' },
  { key: 'storyboard' as const, label: '分镜', icon: '🖼️' },
  { key: 'editing' as const, label: '剪辑', icon: '✂️' },
];

export function TeamCard() {
  const router = useRouter();
  const { roleAssignment } = useCreation();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasTeam = roleAssignment && Object.values(roleAssignment).some(v => v.trim());

  if (!hasTeam) return null;

  const filledCount = Object.values(roleAssignment).filter(v => v.trim()).length;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Expanded Card */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-72 bg-[#12172b] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-white/5 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <h3 className="font-medium text-white">团队分工</h3>
                <p className="text-sm text-gray-400">{filledCount} 人已分配</p>
              </div>
            </div>
          </div>

          {/* Team List */}
          <div className="p-3 space-y-1">
            {TEAM_ROLES.map((role) => (
              <div
                key={role.key}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>{role.icon}</span>
                  <span className="text-sm text-gray-400">{role.label}</span>
                </div>
                <span className="text-sm text-white font-medium">
                  {roleAssignment[role.key] || '-'}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/5">
            <button
              onClick={() => {
                setIsExpanded(false);
                router.push('/role');
              }}
              className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              修改岗位分配
            </button>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200',
          isExpanded
            ? 'bg-blue-500 text-white'
            : 'bg-[#12172b] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
        )}
      >
        {isExpanded ? (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-xl">📋</span>
            <span className="text-[10px] mt-0.5">{filledCount}</span>
          </div>
        )}
      </button>
    </div>
  );
}
