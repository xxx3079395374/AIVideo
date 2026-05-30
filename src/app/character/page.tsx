'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { RoleHeader } from '@/components/role-header';
import { useCreation } from '@/lib/store';
import { CharacterTaskList, EmptyScriptGuide } from '@/components/character-task-list';
import { ImagePreviewDialog } from '@/components/image-preview-dialog';
import type { Character, ScriptScene } from '@/types';

export default function CharacterPage() {
  const router = useRouter();
  const { 
    characters, 
    addCharacter, 
    removeCharacter, 
    updateCharacter,
    generatedScript,
    style 
  } = useCreation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [brushColor, setBrushColor] = useState('#1E293B');
  const [brushSize, setBrushSize] = useState(3);
  const [characterName, setCharacterName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // 检查是否有剧本内容
  const hasScript = generatedScript.length > 0;

  // 初始化画布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布背景为浅色
    ctx.fillStyle = '#FFF7ED';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // 获取坐标（兼容鼠标和触摸）
  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  }, []);

  // 开始绘制
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPosition(e);
    if (!pos) return;

    setIsDrawing(true);
    setLastPos(pos);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // 绘制起始点
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = brushColor;
    ctx.fill();
  }, [getPosition, brushColor, brushSize]);

  // 绘制中
  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const pos = getPosition(e);
    if (!pos || !lastPos) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    setLastPos(pos);
  }, [isDrawing, lastPos, getPosition, brushColor, brushSize]);

  // 结束绘制
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPos(null);
  }, []);

  // 清空画布
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#FFF7ED';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setCapturedImage(null);
  };

  // 打开摄像头
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setIsStreaming(false);
    } catch (err) {
      console.error('打开摄像头失败:', err);
      alert('无法访问摄像头，请检查权限设置');
    }
  };

  // 关闭摄像头
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setIsStreaming(false);
  };

  // 监听摄像头打开
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        setIsStreaming(true);
      };
    }
  }, [isCameraOpen]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 拍照
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isStreaming) {
      alert('请等待视频画面加载完成');
      return;
    }
    if (video.videoWidth === 0) {
      alert('请等待视频画面加载完成');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 计算缩放比例，使图片居中填充画布
    const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const scaledWidth = video.videoWidth * scale;
    const scaledHeight = video.videoHeight * scale;
    const x = (canvas.width - scaledWidth) / 2;
    const y = (canvas.height - scaledHeight) / 2;

    // 清空画布并绘制图片
    ctx.fillStyle = '#FFF7ED';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, x, y, scaledWidth, scaledHeight);

    // 保存拍照图片用于预览
    const imgUrl = canvas.toDataURL('image/png');
    setCapturedImage(imgUrl);

    closeCamera();
  };

  // 选择角色
  const handleSelectCharacter = (characterName: string, sourceScene: ScriptScene) => {
    setSelectedCharacterName(characterName);
    setCharacterName(characterName);
    clearCanvas();
  };

  // 调用 AI 润色接口（复用场景模块的接口）
  const polishCharacter = async (characterId: string, imageBlob: Blob, prompt: string, characterName: string) => {
    try {
      // 创建 FormData
      const formData = new FormData();
      formData.append('image', imageBlob, `${characterName}.png`);
      formData.append('prompt', prompt);
      formData.append('sceneName', characterName);
      // 传递风格参数
      formData.append('style', style);

      const response = await fetch('/api/polish-scene', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      // 直接解析 JSON 响应
      const result = await response.json();

      if (result.synthesizedImageUrl) {
        // 更新角色图片为润色后的图片，状态改为已完成
        updateCharacter(characterId, {
          imageData: result.synthesizedImageUrl,
          status: 'completed',
        });
      } else if (result.rejectReason === 'content_review') {
        // 内容审核未通过
        updateCharacter(characterId, { status: 'rejected' });
      } else {
        // 未获取到润色后的 URL，标记为失败
        updateCharacter(characterId, { status: 'failed' });
      }
    } catch (error) {
      console.error('润色失败:', error);
      updateCharacter(characterId, { status: 'failed' });
    }
  };

  // 提交画板内容
  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSubmitting(true);

    // 获取画布图片数据
    const imageData = canvas.toDataURL('image/png');

    // 创建新的角色
    const characterId = `character-${Date.now()}`;
    const newCharacter: Character = {
      id: characterId,
      name: characterName.trim() || `角色 ${characters.length + 1}`,
      type: 'protagonist',
      usageCount: 0,
      imageData,
      status: 'polishing', // 标记为润色中
    };

    addCharacter(newCharacter);

    // 将 canvas 转为 Blob 并调用润色接口（先获取数据，再清空画布）
    canvas.toBlob(async (blob) => {
      // 清空画布和名称（在获取数据后执行）
      clearCanvas();
      setCharacterName('');
      setIsSubmitting(false);

      if (blob) {
        // 使用角色名称作为 prompt
        const prompt = newCharacter.name;
        await polishCharacter(characterId, blob, prompt, newCharacter.name);
      }
    }, 'image/png');
  };

  // 重试润色
  const handleRetry = (character: Character) => {
    // 更新状态为润色中
    updateCharacter(character.id, { status: 'polishing' });

    // 将当前图片转为 Blob 并重新调用润色接口
    if (character.imageData?.startsWith('http')) {
      fetch(character.imageData)
        .then(res => res.blob())
        .then(blob => {
          polishCharacter(character.id, blob, character.name, character.name);
        })
        .catch(() => {
          updateCharacter(character.id, { status: 'failed' });
        });
    } else if (character.imageData?.startsWith('data:')) {
      // base64 转 Blob
      const base64 = character.imageData.split(',')[1];
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/png' });
      polishCharacter(character.id, blob, character.name, character.name);
    }
  };

  // 重绘：恢复被驳回角色的原始涂鸦到画布
  const handleRedraw = (character: Character) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (character.imageData) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#FFF7ED';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = character.imageData;
    }
    setCharacterName(character.name);
    removeCharacter(character.id);
  };

  // 删除角色
  const handleDelete = (id: string) => {
    removeCharacter(id);
  };

  // 获取状态显示
  const getStatusDisplay = (character: Character) => {
    switch (character.status) {
      case 'polishing':
        return (
          <span className="flex items-center gap-1.5 text-[#FFB800] text-xs font-medium">
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            AI润色中
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 text-[#3BFF5A] text-xs font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            已完成
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 text-[#FF3D00] text-xs font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            润色失败
            <button
              onClick={() => handleRetry(character)}
              className="ml-1 text-[#00C8FF] hover:text-[#00FFE5] underline transition-colors"
            >
              重试
            </button>
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1.5 text-[#FF6B1A] text-xs font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            审核未通过
            <button
              onClick={() => handleRedraw(character)}
              className="ml-1 text-[#FF6B1A] hover:text-[#FFB800] underline font-semibold transition-colors"
            >
              重绘
            </button>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-[#2E4F68] text-xs">
            待润色
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <RoleHeader currentStep="character" />

      {/* 图片预览弹窗 */}
      <ImagePreviewDialog
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageSrc={previewImage?.src || ''}
        title={previewImage?.title || ''}
      />

      <div className="py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* 前置检查：无剧本时显示引导 */}
        {!hasScript ? (
          <EmptyScriptGuide />
        ) : (
          <>
            {/* 角色任务列表 */}
            <div className="mb-6">
              <CharacterTaskList
                scriptScenes={generatedScript}
                drawnCharacters={characters}
                onSelectCharacter={handleSelectCharacter}
                selectedCharacterName={selectedCharacterName || undefined}
              />
            </div>

            {/* 主要内容区 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：画板 */}
          <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-2xl border border-[rgba(0,200,255,0.16)] shadow-[0_0_32px_rgba(0,200,255,0.1)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#E8F8FF] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[rgba(168,85,247,0.12)] flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                  👤
                </span>
                画板
              </h2>
              <div className="flex items-center gap-3">
                {/* 颜色选择 */}
                <div className="flex items-center gap-1.5">
                  {['#1E293B', '#3B82F6', '#EF4444', '#22C55E', '#F59E0B'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setBrushColor(color)}
                      className={cn(
                        'w-7 h-7 rounded-full border-2 transition-all duration-150 shadow-sm active:scale-90',
                        brushColor === color ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'border-[rgba(255,255,255,0.2)] hover:border-[rgba(255,255,255,0.5)]'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {/* 画笔大小 */}
                <select
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="bg-[rgba(0,200,255,0.08)] text-[#E8F8FF] text-sm rounded-lg px-3 py-1.5 border border-[rgba(0,200,255,0.14)] outline-none focus:border-[#00C8FF] font-medium"
                >
                  <option value={2}>细</option>
                  <option value={5}>中</option>
                  <option value={10}>粗</option>
                </select>
                {/* 清空按钮 */}
                <button
                  onClick={clearCanvas}
                  className="p-2 text-[#6B9AB5] hover:text-[#E8F8FF] hover:bg-[rgba(0,200,255,0.08)] rounded-lg transition-all duration-150 active:scale-90"
                  title="清空画布"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 画布容器 */}
            <div className="relative bg-orange-50 rounded-xl overflow-hidden border-2 border-[rgba(0,200,255,0.2)] shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            {/* 角色名称输入 */}
            <div className="mt-4">
              <label className="text-sm text-[#6B9AB5] mb-1.5 block font-medium">
                角色名称<span className="text-[#FF3D00] ml-1">*</span>（作为AI润色提示词）
              </label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="例如：勇敢的骑士"
                className="w-full bg-[rgba(0,200,255,0.04)] border border-[rgba(0,200,255,0.12)] rounded-xl px-4 py-2.5 text-[#E8F8FF] text-sm placeholder-[#2E4F68] focus:border-[#00C8FF] focus:ring-2 focus:ring-[rgba(0,200,255,0.15)] focus:outline-none transition-all"
              />
            </div>

            {/* 提交按钮 */}
            <div className="mt-4 flex justify-center gap-4">
              {/* 拍照绘制按钮 */}
              <button
                onClick={openCamera}
                className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#A855F7] to-[#C084FC] text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_32px_rgba(168,85,247,0.45)] active:shadow-[0_0_40px_rgba(168,85,247,0.55)] transition-all duration-150 active:scale-95 flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                拍照绘制
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !characterName.trim()}
                className={cn(
                  'px-8 py-3 rounded-xl font-bold transition-all duration-150 active:scale-95',
                  isSubmitting || !characterName.trim()
                    ? 'bg-[rgba(0,200,255,0.06)] text-[#2E4F68] cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#00C8FF] to-[#00FFE5] text-[#0a1628] shadow-[0_0_24px_rgba(0,200,255,0.35)] hover:shadow-[0_0_36px_rgba(0,200,255,0.5)] active:shadow-[0_0_48px_rgba(0,200,255,0.6)]'
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    处理中...
                  </span>
                ) : (
                  '提交并AI润色'
                )}
              </button>
            </div>
            <p className="mt-2 text-[#2E4F68] text-sm text-center">
              {!characterName.trim() ? '请先输入角色名称' : '拍照绘制或手绘后提交AI润色'}
            </p>
          </div>

          {/* 右侧：角色列表 */}
          <div className="bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-2xl border border-[rgba(0,200,255,0.16)] shadow-[0_0_20px_rgba(0,200,255,0.08)] p-6 min-h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#E8F8FF] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[rgba(168,85,247,0.12)] flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                  👥
                </span>
                角色列表
              </h2>
              <span className="text-sm text-[#6B9AB5] font-medium bg-[rgba(0,200,255,0.08)] px-3 py-1 rounded-full border border-[rgba(0,200,255,0.12)]">{characters.length} 个</span>
            </div>

            {characters.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[rgba(0,200,255,0.06)] flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-[#2E4F68]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <path d="M20 8v6M23 11h-6" />
                    </svg>
                  </div>
                  <p className="text-[#6B9AB5] text-sm">暂无角色</p>
                  <p className="text-[#2E4F68] text-xs mt-1">在左侧画板绘制后提交</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {characters.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      'rounded-xl p-3 flex items-center gap-3 transition-all duration-150 hover:shadow-[0_0_16px_rgba(0,200,255,0.1)] border',
                      item.status === 'failed' ? 'border-[rgba(255,61,0,0.3)] bg-[rgba(255,61,0,0.06)]' :
                      item.status === 'rejected' ? 'border-[rgba(255,107,26,0.3)] bg-[rgba(255,107,26,0.06)]' :
                      'border-[rgba(0,200,255,0.12)] bg-[rgba(14,32,60,0.6)]'
                    )}
                  >
                    {/* 缩略图 */}
                    <div
                      className="w-14 h-14 rounded-full overflow-hidden bg-[rgba(0,200,255,0.08)] shrink-0 shadow-sm cursor-pointer hover:ring-2 hover:ring-[#A855F7] transition-all duration-150"
                      onClick={() => item.imageData && setPreviewImage({ src: item.imageData, title: item.name })}
                    >
                      {item.imageData ? (
                        <img
                          src={item.imageData}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[#6B9AB5] text-lg">👤</span>
                        </div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[#E8F8FF] text-sm font-medium truncate">
                          {item.name}
                        </span>
                        {getStatusDisplay(item)}
                      </div>
                      <p className="text-[#6B9AB5] text-xs mt-0.5">
                        角色 #{index + 1}
                      </p>
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-[#2E4F68] hover:text-[#FF3D00] hover:bg-[rgba(255,61,0,0.1)] rounded-lg transition-all duration-150 active:scale-90 shrink-0"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={() => router.push('/scene')}
            className="px-6 py-3 rounded-xl border border-[rgba(0,200,255,0.14)] text-[#6B9AB5] hover:text-[#E8F8FF] hover:border-[rgba(0,200,255,0.3)] hover:bg-[rgba(0,200,255,0.06)] transition-all duration-150 font-medium active:scale-95"
          >
            上一步
          </button>
          <button
            onClick={() => router.push('/storyboard')}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#FF6B1A] text-white font-bold hover:from-[#B865FF] hover:to-[#FF7B2A] transition-all duration-150 shadow-[0_0_24px_rgba(168,85,247,0.3)] hover:shadow-[0_0_36px_rgba(168,85,247,0.45)] active:shadow-[0_0_48px_rgba(168,85,247,0.55)] active:scale-95"
          >
            下一步：分镜生成
          </button>
        </div>
          </>
        )}

        {/* 摄像头弹窗 */}
        {isCameraOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
          >
            <div className="relative w-full max-w-2xl mx-4">
              {/* 视频预览 */}
              <div className="relative bg-black rounded-xl overflow-hidden border border-[rgba(0,200,255,0.16)]" style={{ aspectRatio: "16/9" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white text-center">
                      <svg className="animate-spin w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <p>正在连接摄像头...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="mt-4 flex justify-center gap-4">
                <button
                  onClick={closeCamera}
                  className="px-6 py-3 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-medium transition-all duration-150 active:scale-95"
                >
                  取消
                </button>
                <button
                  onClick={takePhoto}
                  disabled={!isStreaming}
                  className={cn(
                    'px-6 py-3 rounded-xl font-bold transition-all duration-150 active:scale-95 flex items-center gap-2',
                    isStreaming
                      ? 'bg-gradient-to-r from-[#A855F7] to-[#C084FC] text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_32px_rgba(168,85,247,0.55)]'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  )}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                  拍照
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
