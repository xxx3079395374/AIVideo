'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { StepConfig } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const steps: StepConfig[] = [
  { key: 'role', label: '岗位分配', path: '/role' },
  { key: 'start', label: '创作启动', path: '/start' },
  { key: 'scene', label: '场景', path: '/scene' },
  { key: 'character', label: '角色', path: '/character' },
  { key: 'storyboard', label: '分镜生成', path: '/storyboard' },
  { key: 'video', label: '视频生成', path: '/video' },
  { key: 'result', label: '视频成品', path: '/result' },
];

// 为每个步骤分配不同的霓虹色
const stepColors = [
  { bg: 'bg-[#00C8FF]', light: 'bg-[rgba(0,200,255,0.1)]', text: 'text-[#00C8FF]', border: 'border-[rgba(0,200,255,0.3)]', glow: 'shadow-[0_0_12px_rgba(0,200,255,0.3)]' },
  { bg: 'bg-[#3B82F6]', light: 'bg-[rgba(59,130,246,0.1)]', text: 'text-[#3B82F6]', border: 'border-[rgba(59,130,246,0.3)]', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]' },
  { bg: 'bg-[#3BFF5A]', light: 'bg-[rgba(59,255,90,0.1)]', text: 'text-[#3BFF5A]', border: 'border-[rgba(59,255,90,0.3)]', glow: 'shadow-[0_0_12px_rgba(59,255,90,0.3)]' },
  { bg: 'bg-[#A855F7]', light: 'bg-[rgba(168,85,247,0.1)]', text: 'text-[#A855F7]', border: 'border-[rgba(168,85,247,0.3)]', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.3)]' },
  { bg: 'bg-[#FF6B1A]', light: 'bg-[rgba(255,107,26,0.1)]', text: 'text-[#FF6B1A]', border: 'border-[rgba(255,107,26,0.3)]', glow: 'shadow-[0_0_12px_rgba(255,107,26,0.3)]' },
  { bg: 'bg-[#FFB800]', light: 'bg-[rgba(255,184,0,0.1)]', text: 'text-[#FFB800]', border: 'border-[rgba(255,184,0,0.3)]', glow: 'shadow-[0_0_12px_rgba(255,184,0,0.3)]' },
  { bg: 'bg-[#00C8FF]', light: 'bg-[rgba(0,200,255,0.1)]', text: 'text-[#00C8FF]', border: 'border-[rgba(0,200,255,0.3)]', glow: 'shadow-[0_0_12px_rgba(0,200,255,0.3)]' },
];

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getCurrentStep = () => {
    const currentPath = pathname || '/';
    const stepIndex = steps.findIndex(s => s.path === currentPath);
    return stepIndex >= 0 ? stepIndex : 0;
  };

  const currentStep = getCurrentStep();
  const currentStepInfo = steps[currentStep];
  const currentColors = stepColors[currentStep];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[rgba(22,48,84,0.94)] backdrop-blur-xl border-b border-[rgba(0,200,255,0.18)]">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00C8FF] to-[#00FFE5] flex items-center justify-center shadow-[0_0_20px_rgba(0,200,255,0.3)]">
            <svg className="w-5 h-5 text-[#0a1628]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <span className="text-lg font-black tracking-[3px]" style={{ fontFamily: 'Orbitron, sans-serif', background: 'linear-gradient(135deg, #00C8FF, #00FFE5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Xone
          </span>
        </div>

        {/* Steps Navigation - Desktop */}
        <nav className="hidden lg:flex items-center gap-1">
          {steps.map((step, index) => {
            const colors = stepColors[index];
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => router.push(step.path)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-xl transition-all duration-150 active:scale-95',
                    isActive && cn(colors.light, colors.text, colors.glow),
                    isCompleted && 'text-[#2E4F68] hover:text-[#6B9AB5] hover:bg-[rgba(0,200,255,0.04)]',
                    !isActive && !isCompleted && 'text-[#2E4F68] hover:text-[#6B9AB5] hover:bg-[rgba(0,200,255,0.04)]'
                  )}
                >
                  {step.label}
                </button>
                {index < steps.length - 1 && (
                  <div className={cn(
                    'w-6 h-0.5 mx-2 rounded-full transition-all duration-300',
                    isCompleted ? cn(colors.bg, 'shadow-[0_0_6px] shadow-current') : 'bg-[rgba(0,200,255,0.1)]'
                  )} />
                )}
              </div>
            );
          })}
        </nav>

        {/* Steps Navigation - Mobile/Tablet */}
        <div className="lg:hidden flex items-center gap-2">
          <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-xl transition-all duration-150 active:scale-95',
                currentColors.light,
                currentColors.text,
                'shadow-[0_0_10px] shadow-current/20'
              )}>
                <span className="hidden xs:inline">{currentStepInfo.label}</span>
                <span className="xs:hidden">当前步骤</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[rgba(22,48,84,0.96)] backdrop-blur-xl border border-[rgba(0,200,255,0.18)] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
              {steps.map((step, index) => {
                const colors = stepColors[index];
                const isActive = index === currentStep;

                return (
                  <DropdownMenuItem
                    key={step.key}
                    onClick={() => {
                      router.push(step.path);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 cursor-pointer',
                      isActive ? cn(colors.bg, 'text-white') : 'text-[#6B9AB5] hover:text-[#E8F8FF] hover:bg-[rgba(0,200,255,0.06)]'
                    )}
                  >
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      isActive ? 'bg-white' : colors.bg
                    )} />
                    {step.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          <button className="p-2 text-[#2E4F68] hover:text-[#6B9AB5] hover:bg-[rgba(0,200,255,0.06)] rounded-lg transition-all duration-150 active:scale-90">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00C8FF] to-[#A855F7] flex items-center justify-center cursor-pointer shadow-[0_0_16px_rgba(0,200,255,0.25)]">
            <span className="text-sm font-medium text-white">U</span>
          </div>
        </div>
      </div>
    </header>
  );
}
