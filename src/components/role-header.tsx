'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCreation } from '@/lib/store';
import type { CreationStep } from '@/types';

interface RoleHeaderProps {
  currentStep: CreationStep;
}

// 页面与岗位的映射关系
const STEP_ROLE_MAP: Record<CreationStep, { key: string; label: string; icon: string; color: string } | null> = {
  start: { key: 'screenwriter', label: '编剧', icon: '✍️', color: 'blue' },
  role: null,
  script: { key: 'screenwriter', label: '编剧', icon: '✍️', color: 'blue' },
  scene: { key: 'sceneDesign', label: '场景设计', icon: '🎨', color: 'green' },
  character: { key: 'characterDesign', label: '角色设计', icon: '👤', color: 'pink' },
  storyboard: { key: 'storyboard', label: '分镜', icon: '🖼️', color: 'orange' },
  video: { key: 'editing', label: '剪辑', icon: '✂️', color: 'purple' },
  result: { key: 'editing', label: '剪辑', icon: '🎬', color: 'purple' },
};

// 颜色配置
const colorConfig: Record<string, { bg: string; text: string; light: string; glow: string }> = {
  blue:   { bg: 'bg-[#00C8FF]', text: 'text-[#00C8FF]', light: 'bg-[rgba(0,200,255,0.12)]', glow: 'shadow-[0_0_10px_rgba(0,200,255,0.25)]' },
  green:  { bg: 'bg-[#3BFF5A]', text: 'text-[#3BFF5A]', light: 'bg-[rgba(59,255,90,0.12)]',  glow: 'shadow-[0_0_10px_rgba(59,255,90,0.25)]' },
  pink:   { bg: 'bg-[#A855F7]', text: 'text-[#A855F7]', light: 'bg-[rgba(168,85,247,0.12)]',  glow: 'shadow-[0_0_10px_rgba(168,85,247,0.25)]' },
  orange: { bg: 'bg-[#FF6B1A]', text: 'text-[#FF6B1A]', light: 'bg-[rgba(255,107,26,0.12)]', glow: 'shadow-[0_0_10px_rgba(255,107,26,0.25)]' },
  purple: { bg: 'bg-[#A855F7]', text: 'text-[#A855F7]', light: 'bg-[rgba(168,85,247,0.12)]', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.25)]' },
};

export function RoleHeader({ currentStep }: RoleHeaderProps) {
  const router = useRouter();
  const { roleAssignment } = useCreation();

  const roleInfo = STEP_ROLE_MAP[currentStep];
  
  // 如果页面没有对应的岗位或没有团队数据，不显示
  if (!roleInfo || !roleAssignment) return null;

  const personName = roleAssignment[roleInfo.key as keyof typeof roleAssignment];
  const hasPerson = personName?.trim();
  const colors = colorConfig[roleInfo.color];

  return (
    <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-xl border-b border-[rgba(0,200,255,0.14)] px-4 py-2 md:py-3 shadow-[0_0_20px_rgba(0,200,255,0.08)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Role Info - Responsive */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className={cn(
            'w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center shadow-sm',
            colors.light,
            colors.glow
          )}>
            <span className="text-base md:text-lg">{roleInfo.icon}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="text-[#6B9AB5] text-xs md:text-sm hidden xs:inline">{roleInfo.label}:</span>
            <span className={cn(
              'text-xs md:text-sm font-medium px-2 md:px-3 py-0.5 md:py-1 rounded-full',
              hasPerson ? 'text-[#E8F8FF]' : 'text-[#2E4F68]'
            )}>
              {hasPerson ? personName : '暂无负责人'}
            </span>
          </div>
        </div>

        {/* Modify Button - Responsive */}
        <button
          onClick={() => router.push('/role')}
          className={cn(
            'text-xs font-medium px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1 active:scale-90',
            colors.text,
            'hover:bg-[rgba(0,200,255,0.08)]'
          )}
        >
          <svg className="w-3 md:w-3.5 h-3 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span className="hidden xs:inline">修改</span>
        </button>
      </div>
    </div>
  );
}
