'use client';

import { useEffect, useRef } from 'react';

interface VoiceWaveModalProps {
  isVisible: boolean;
  recognizedText: string;
  onStopRecording: () => void;
}

export function VoiceWaveModal({ isVisible, recognizedText, onStopRecording }: VoiceWaveModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // 音纹动画
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas尺寸
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * 2; // 高清屏
      canvas.height = canvas.offsetHeight * 2;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let time = 0;

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const bars = 40; // 波纹条数量
      const barWidth = width / bars;

      for (let i = 0; i < bars; i++) {
        // 使用多个正弦波叠加，创造更自然的波形
        const wave1 = Math.sin((i * 0.2) + time * 0.05) * 0.5;
        const wave2 = Math.sin((i * 0.15) + time * 0.03) * 0.3;
        const wave3 = Math.sin((i * 0.25) + time * 0.07) * 0.2;
        
        // 基础高度 + 波动
        const baseHeight = height * 0.3;
        const waveHeight = (wave1 + wave2 + wave3) * (height * 0.4);
        const barHeight = Math.max(baseHeight, baseHeight + waveHeight);

        // 创建渐变色
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#00C8FF');
        gradient.addColorStop(0.5, '#A855F7');
        gradient.addColorStop(1, '#FF6B1A');

        ctx.fillStyle = gradient;

        // 绘制圆角条
        const x = i * barWidth + barWidth * 0.1;
        const y = (height - barHeight) / 2;
        const w = barWidth * 0.8;
        const h = barHeight;
        const radius = w / 2;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
      }

      time++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-in slide-in-from-bottom duration-300">
      <div className="w-full max-w-2xl bg-[rgba(8,20,42,0.95)] backdrop-blur-xl rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.5),0_0_60px_rgba(0,200,255,0.05)] border border-[rgba(0,200,255,0.14)] p-4 pb-6">
        {/* 识别文字 - 根据使用场景决定是否显示 */}
        {recognizedText && (
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-[#E8F8FF]">{recognizedText}</p>
            <p className="text-sm text-[#6B9AB5]">识别结果</p>
          </div>
        )}

        {/* 音纹动画 */}
        <div className="relative w-full h-24 mb-4">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
        </div>

        {/* 停止按钮 */}
        <div className="flex justify-center">
          <button
            onClick={onStopRecording}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#FF6B1A] to-[#FF3D00] hover:from-[#FF7B2A] hover:to-[#FF4D10] text-white rounded-2xl font-bold text-lg transition-all duration-150 shadow-[0_0_24px_rgba(255,107,26,0.35)] hover:shadow-[0_0_36px_rgba(255,107,26,0.5)] active:shadow-[0_0_48px_rgba(255,107,26,0.6)] transform hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            停止录音
          </button>
        </div>
      </div>
    </div>
  );
}
