'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCreation } from '@/lib/store';
import { RoleHeader } from '@/components/role-header';
import { VoiceInput } from '@/components/voice-input';
import { ImagePreviewDialog } from '@/components/image-preview-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { StoryboardImage, Scene, Character } from '@/types';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
} from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';

type DragItem = { type: 'scene' | 'character' | 'storyboard'; data: Scene | Character | StoryboardImage };

// ---- @dnd-kit ID helpers ----
const PREFIX_SCENE = 'scene-';
const PREFIX_CHAR = 'character-';
const PREFIX_SB = 'storyboard-';
const PREFIX_DROP = 'drop-';

function dndId(type: 'scene' | 'character' | 'storyboard', id: string) {
  return (type === 'scene' ? PREFIX_SCENE : type === 'character' ? PREFIX_CHAR : PREFIX_SB) + id;
}
function dropId(storyboardId: string) { return PREFIX_DROP + storyboardId; }
function parseDropId(id: string): string | null {
  return id.startsWith(PREFIX_DROP) ? id.slice(PREFIX_DROP.length) : null;
}

// ---- @dnd-kit 包装组件 ----
function DraggableMaterialItem({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: React.CSSProperties = {
    touchAction: 'none',
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
  };
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className={cn(className, isDragging && 'opacity-50')}>
      {children}
    </div>
  );
}

function DroppableCardWrapper({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: dropId(id) });
  return <div ref={setNodeRef} className={className}>{children}</div>;
}

export default function StoryboardPage() {
  const router = useRouter();
  const { 
    generatedScript, 
    storyboardImages, 
    setStoryboardImages,
    updateStoryboardImage,
    addStoryboardImage,
    deleteStoryboardImage,
    scenes,
    characters,
    style 
  } = useCreation();
  
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());
  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMaterialTab, setActiveMaterialTab] = useState<'scene' | 'character' | 'storyboard'>('scene');
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState<StoryboardImage | null>(null);

  // 删除确认弹窗
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // 添加分镜弹窗
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSbTitle, setNewSbTitle] = useState('');
  const [newSbSummary, setNewSbSummary] = useState('');
  const [newSbLocation, setNewSbLocation] = useState('');
  const [newSbTime, setNewSbTime] = useState('');
  const [newSbWeather, setNewSbWeather] = useState('');
  const [newSbCharacters, setNewSbCharacters] = useState('');
  const [newSbPrompt, setNewSbPrompt] = useState('');

  // 初始化 / 同步分镜数据：以 generatedScript 为准，保留已有生成结果
  useEffect(() => {
    if (generatedScript.length === 0) return;

    const sceneIds = new Set(generatedScript.map(s => s.id));
    const sbIdSet = new Set(storyboardImages.map(s => s.id));

    const needsSync =
      sceneIds.size !== sbIdSet.size || ![...sceneIds].every(id => sbIdSet.has(id));

    if (needsSync) {
      const updated: StoryboardImage[] = generatedScript.map((scene) => {
        const existing = storyboardImages.find(s => s.id === scene.id);
        if (existing) {
          return {
            ...existing,
            sceneNumber: scene.sceneNumber,
            sceneCode: scene.sceneCode,
            title: scene.title,
            prompt: scene.description || existing.prompt,
          };
        }
        return {
          id: scene.id,
          sceneNumber: scene.sceneNumber,
          sceneCode: scene.sceneCode,
          title: scene.title,
          prompt: scene.description || '',
          status: 'pending' as const,
        };
      });
      setStoryboardImages(updated);
    }
  }, [generatedScript, storyboardImages, setStoryboardImages]);

  // 如果没有剧本数据，显示空状态
  if (generatedScript.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <RoleHeader currentStep="storyboard" />
        <div className="py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-[rgba(255,107,26,0.12)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(255,107,26,0.15)]">
                <svg className="w-10 h-10 text-[#FF6B1A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#E8F8FF] mb-2">暂无剧本数据</h2>
              <p className="text-[#6B9AB5] mb-6">请先在创作启动页面生成分镜剧本</p>
              <button
                onClick={() => router.push('/start')}
                className="px-6 py-2.5 bg-gradient-to-r from-[#FF6B1A] to-[#FFB800] text-white rounded-xl font-medium transition-all duration-150 shadow-[0_0_20px_rgba(255,107,26,0.3)] hover:shadow-[0_0_32px_rgba(255,107,26,0.45)] active:scale-95"
              >
                前往创作启动
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 获取关联的场景和角色
  const getLinkedScene = (storyboard: StoryboardImage) => 
    scenes.find(s => s.id === storyboard.linkedSceneId);
  
  const getLinkedCharacters = (storyboard: StoryboardImage) => 
    characters.filter(c => (storyboard.linkedCharacterIds || []).includes(c.id));

  const getReferencedStoryboard = (storyboard: StoryboardImage) =>
    storyboardImages.find(s => s.id === storyboard.referencedStoryboardId);

  const getMatchingScript = (image: StoryboardImage) =>
    generatedScript.find(s => s.id === image.id);

  // 生成分镜图片
  const generateImage = async (image: StoryboardImage) => {
    // 收集参考素材 URL
    const referenceUrls: string[] = [];
    
    // 添加参考分镜图片（优先级高于场景）
    const refStoryboard = getReferencedStoryboard(image);
    if (refStoryboard?.imageUrl) {
      referenceUrls.push(refStoryboard.imageUrl);
    }
    
    // 添加场景图片
    const linkedScene = getLinkedScene(image);
    if (linkedScene?.imageData) {
      referenceUrls.push(linkedScene.imageData);
    }
    
    // 添加角色图片
    const linkedCharacters = getLinkedCharacters(image);
    for (const char of linkedCharacters) {
      if (char.imageData) {
        referenceUrls.push(char.imageData);
      }
    }

    // 调用后端 API
    const response = await fetch('/api/generate-storyboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: image.prompt,
        images: referenceUrls,
        style,
      }),
    });

    if (!response.ok) {
      throw new Error(`生成失败: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.imageUrl) {
      throw new Error(result.error || '生成失败');
    }

    return result.imageUrl;
  };

  const handleGenerateImage = async (image: StoryboardImage, isRegenerate = false) => {
    // 如果是重新生成，先清除原来的图片并添加到重新生成状态
    if (isRegenerate) {
      // 清除原图，显示加载状态
      setStoryboardImages(prev => prev.map(img =>
        img.id === image.id
          ? { ...img, imageUrl: undefined }
          : img
      ));
      setRegeneratingIds(prev => new Set(prev).add(image.id));
    } else {
      setGeneratingIds(prev => new Set(prev).add(image.id));
    }
    
    try {
      const imageUrl = await generateImage(image);
      
      setStoryboardImages(prev => prev.map(img =>
        img.id === image.id
          ? { ...img, status: 'completed' as const, imageUrl }
          : img
      ));
    } catch (error) {
      console.error('图片生成失败:', error);
      setStoryboardImages(prev => prev.map(img =>
        img.id === image.id
          ? { ...img, status: 'failed' as const }
          : img
      ));
    } finally {
      // 从对应状态中移除
      if (isRegenerate) {
        setRegeneratingIds(prev => {
          const next = new Set(prev);
          next.delete(image.id);
          return next;
        });
      } else {
        setGeneratingIds(prev => {
          const next = new Set(prev);
          next.delete(image.id);
          return next;
        });
      }
    }
  };

  const handleDeleteStoryboard = (id: string) => {
    const image = storyboardImages.find(s => s.id === id);
    setDeleteTarget({ id, title: image?.title || '新分镜' });
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteStoryboardImage(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleOpenAddDialog = () => {
    setNewSbTitle('');
    setNewSbSummary('');
    setNewSbLocation('');
    setNewSbTime('');
    setNewSbWeather('');
    setNewSbCharacters('');
    setNewSbPrompt('');
    setShowAddDialog(true);
  };

  const handleAddStoryboard = () => {
    const title = newSbTitle.trim() || '新分镜';
    addStoryboardImage({
      title,
      prompt: newSbPrompt.trim(),
      summary: newSbSummary.trim(),
      sceneLocation: newSbLocation.trim(),
      time: newSbTime.trim(),
      weather: newSbWeather.trim(),
      characters: newSbCharacters.trim(),
    } as any);
    setShowAddDialog(false);
  };

  const handleEditPrompt = (id: string, newPrompt: string) => {
    setStoryboardImages(prev => prev.map(img =>
      img.id === id ? { ...img, prompt: newPrompt } : img
    ));
  };

  // @dnd-kit: 用 ref 保持最新数据引用，避免回调依赖变化
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;
  const charactersRef = useRef(characters);
  charactersRef.current = characters;
  const storyboardImagesRef = useRef(storyboardImages);
  storyboardImagesRef.current = storyboardImages;

  const getDragItem = useCallback((id: string): DragItem | null => {
    if (id.startsWith(PREFIX_SCENE)) {
      const scene = scenesRef.current.find(s => s.id === id.slice(PREFIX_SCENE.length));
      return scene ? { type: 'scene', data: scene } : null;
    }
    if (id.startsWith(PREFIX_CHAR)) {
      const c = charactersRef.current.find(c => c.id === id.slice(PREFIX_CHAR.length));
      return c ? { type: 'character', data: c } : null;
    }
    if (id.startsWith(PREFIX_SB)) {
      const sb = storyboardImagesRef.current.find(s => s.id === id.slice(PREFIX_SB.length));
      return sb ? { type: 'storyboard', data: sb } : null;
    }
    return null;
  }, []);

  const applyDrop = useCallback((dragItem: DragItem, storyboardId: string) => {
    const storyboard = storyboardImagesRef.current.find(img => img.id === storyboardId);
    if (!storyboard) return;

    if (dragItem.type === 'scene') {
      const scene = dragItem.data as Scene;
      updateStoryboardImage(storyboardId, { linkedSceneId: scene.id, referencedStoryboardId: undefined });
    } else if (dragItem.type === 'character') {
      const character = dragItem.data as Character;
      const currentIds = storyboard.linkedCharacterIds || [];
      if (!currentIds.includes(character.id)) {
        updateStoryboardImage(storyboardId, { linkedCharacterIds: [...currentIds, character.id] });
      }
    } else if (dragItem.type === 'storyboard') {
      const refStoryboard = dragItem.data as StoryboardImage;
      updateStoryboardImage(storyboardId, { referencedStoryboardId: refStoryboard.id, linkedSceneId: undefined });
    }
  }, [updateStoryboardImage]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDndDragStart = useCallback((event: DragStartEvent) => {
    const item = getDragItem(String(event.active.id));
    if (item) setActiveDragItem(item);
  }, [getDragItem]);

  const handleDndDragOver = useCallback((event: DragOverEvent) => {
    setDropTargetId(parseDropId(String(event.over?.id ?? '')));
  }, []);

  const handleDndDragEnd = useCallback((event: DragEndEvent) => {
    const targetId = parseDropId(String(event.over?.id ?? ''));
    if (targetId) {
      const item = getDragItem(String(event.active.id));
      if (item) applyDrop(item, targetId);
    }
    setActiveDragItem(null);
    setDropTargetId(null);
  }, [getDragItem, applyDrop]);

  // 移除关联
  const handleRemoveReferenceImage = (storyboardId: string) => {
    updateStoryboardImage(storyboardId, { linkedSceneId: undefined, referencedStoryboardId: undefined });
  };

  const handleRemoveCharacter = (storyboardId: string, characterId: string) => {
    const storyboard = storyboardImages.find(img => img.id === storyboardId);
    if (!storyboard) return;
    
    const newIds = (storyboard.linkedCharacterIds || []).filter(id => id !== characterId);
    updateStoryboardImage(storyboardId, { linkedCharacterIds: newIds });
  };

  // 移除参考分镜
  const handleNext = () => {
    router.push('/video');
  };

  const completedCount = storyboardImages.filter(img => img.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <RoleHeader currentStep="storyboard" />
      
      {/* 图片预览弹窗 */}
      <ImagePreviewDialog
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageSrc={previewImage?.src || ''}
        title={previewImage?.title || ''}
      />

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除分镜「{deleteTarget?.title}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 添加分镜弹窗 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加新分镜</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="sb-title">分镜标题</Label>
              <Input
                id="sb-title"
                value={newSbTitle}
                onChange={(e) => setNewSbTitle(e.target.value)}
                placeholder="如：发射准备"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sb-summary">简介</Label>
              <Input
                id="sb-summary"
                value={newSbSummary}
                onChange={(e) => setNewSbSummary(e.target.value)}
                placeholder="一句话概括本场景"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sb-location">场景</Label>
              <Input
                id="sb-location"
                value={newSbLocation}
                onChange={(e) => setNewSbLocation(e.target.value)}
                placeholder="如：外 山谷中央发射台"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sb-time">时间</Label>
                <Input
                  id="sb-time"
                  value={newSbTime}
                  onChange={(e) => setNewSbTime(e.target.value)}
                  placeholder="如：清晨"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sb-weather">天气</Label>
                <Input
                  id="sb-weather"
                  value={newSbWeather}
                  onChange={(e) => setNewSbWeather(e.target.value)}
                  placeholder="如：晴"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sb-characters">出场人物</Label>
              <Input
                id="sb-characters"
                value={newSbCharacters}
                onChange={(e) => setNewSbCharacters(e.target.value)}
                placeholder="如：火箭、指挥官"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sb-prompt">镜头描述</Label>
              <Textarea
                id="sb-prompt"
                value={newSbPrompt}
                onChange={(e) => setNewSbPrompt(e.target.value)}
                placeholder="描述画面内容、运镜、氛围等..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAddStoryboard}>确认添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重新生成确认弹窗 */}
      {regenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRegenerateConfirm(null)} />
          <div className="relative bg-[rgba(22,48,84,0.96)] backdrop-blur-xl rounded-2xl shadow-[0_0_32px_rgba(0,200,255,0.15)] border border-[rgba(0,200,255,0.16)] p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-[#E8F8FF] mb-2">确认重新生成</h3>
            <p className="text-[#6B9AB5] text-sm mb-6">
              确定要重新生成「{regenerateConfirm.title}」吗？<br/>
              该操作将替换当前图片，可能需要 1-2 分钟。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRegenerateConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-[rgba(0,200,255,0.2)] text-[#B8D8F0] rounded-xl hover:bg-[rgba(0,200,255,0.06)] transition-all duration-150 font-medium active:scale-95"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const image = regenerateConfirm;
                  setRegenerateConfirm(null);
                  handleGenerateImage(image, true);
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#FF6B1A] to-[#FFB800] text-white rounded-xl font-medium transition-all duration-150 shadow-[0_0_16px_rgba(255,107,26,0.3)] hover:shadow-[0_0_24px_rgba(255,107,26,0.45)] active:scale-95"
              >
                确认生成
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#E8F8FF]">分镜生成</h1>
            <p className="text-[#6B9AB5] text-sm mt-1">为每个场次生成对应的分镜图片，可拖拽场景和角色作为参考素材</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#6B9AB5]">
              已完成 <span className="text-[#FF6B1A] font-semibold">{completedCount}</span> / {storyboardImages.length}
            </span>
            <button
              onClick={handleOpenAddDialog}
              className="px-4 py-2.5 rounded-xl font-medium text-sm border-2 border-dashed border-[rgba(0,200,255,0.2)] text-[#6B9AB5] hover:text-[#FF6B1A] hover:border-[rgba(255,107,26,0.4)] hover:bg-[rgba(255,107,26,0.06)] transition-all duration-150 flex items-center gap-1.5 active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              添加分镜
            </button>
          </div>
        </div>

        {/* Main Content */}
        <DndContext autoScroll={false} sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDndDragStart} onDragOver={handleDndDragOver} onDragEnd={handleDndDragEnd}>
        <div className="space-y-4">
          {/* Sticky Header with Materials Library */}
          <div className="sticky top-20 z-40 bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-xl border border-[rgba(0,200,255,0.16)] shadow-[0_0_20px_rgba(0,200,255,0.08)] overflow-hidden">
              {/* Toggle + Tab Bar */}
              <div
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="flex items-center border-b border-[rgba(0,200,255,0.12)] bg-[rgba(14,32,60,0.5)] hover:bg-[rgba(14,32,60,0.8)] cursor-pointer select-none transition-colors duration-200 group/header"
              >
                <div className="px-3.5 py-2.5 flex items-center gap-2 text-[#6B9AB5] shrink-0">
                  <svg className="w-4 h-4 text-[#FF6B1A] group-hover/header:text-[#FF8C3A] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  <span className="text-sm font-medium group-hover/header:text-[#B8D8F0] transition-colors">素材库</span>
                  <span className="text-[11px] text-[#2E4F68]">({scenes.filter(s => s.status === 'completed').length + characters.filter(c => c.status === 'completed').length + storyboardImages.filter(s => s.status === 'completed').length})</span>
                </div>

                {!sidebarCollapsed && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-2 border-l border-[rgba(0,200,255,0.14)] ml-1"
                  >
                    <button
                      onClick={() => setActiveMaterialTab('scene')}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150',
                        activeMaterialTab === 'scene'
                          ? 'bg-[rgba(0,200,255,0.15)] text-[#00C8FF] shadow-[0_0_8px_rgba(0,200,255,0.15)]'
                          : 'text-[#6B9AB5] hover:text-[#B8D8F0] hover:bg-[rgba(0,200,255,0.06)]'
                      )}
                    >
                      场景<span className="ml-1 text-[10px] opacity-60">{scenes.filter(s => s.status === 'completed').length}</span>
                    </button>
                    <button
                      onClick={() => setActiveMaterialTab('character')}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150',
                        activeMaterialTab === 'character'
                          ? 'bg-[rgba(168,85,247,0.15)] text-[#A855F7] shadow-[0_0_8px_rgba(168,85,247,0.15)]'
                          : 'text-[#6B9AB5] hover:text-[#B8D8F0] hover:bg-[rgba(168,85,247,0.06)]'
                      )}
                    >
                      角色<span className="ml-1 text-[10px] opacity-60">{characters.filter(c => c.status === 'completed').length}</span>
                    </button>
                    <button
                      onClick={() => setActiveMaterialTab('storyboard')}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150',
                        activeMaterialTab === 'storyboard'
                          ? 'bg-[rgba(255,107,26,0.15)] text-[#FF6B1A] shadow-[0_0_8px_rgba(255,107,26,0.15)]'
                          : 'text-[#6B9AB5] hover:text-[#B8D8F0] hover:bg-[rgba(255,107,26,0.06)]'
                      )}
                    >
                      分镜图<span className="ml-1 text-[10px] opacity-60">{storyboardImages.filter(s => s.status === 'completed').length}</span>
                    </button>
                  </div>
                )}

                <div className="flex-1" />
                <div className="flex items-center gap-1.5 px-3 py-2 text-[#2E4F68] shrink-0 group-hover/header:text-[#6B9AB5] transition-colors">
                  <span className="text-[11px] font-medium">
                    {sidebarCollapsed ? '展开' : '收起'}
                  </span>
                  <svg
                    className={cn('w-3.5 h-3.5 transition-transform duration-200', sidebarCollapsed && 'rotate-180')}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                </div>
              </div>

              {!sidebarCollapsed && (
                <div className="px-4 py-3">
                  {/* Scene Tab Content */}
                  {activeMaterialTab === 'scene' && (
                    scenes.filter(s => s.status === 'completed').length === 0 ? (
                      <button
                        onClick={() => router.push('/scene')}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-[rgba(0,200,255,0.16)] text-[#2E4F68] text-xs hover:border-[#00C8FF] hover:text-[#00C8FF] hover:bg-[rgba(0,200,255,0.04)] transition-all duration-150"
                      >
                        暂无场景 — 点击去绘制
                      </button>
                    ) : (
                      <div className="flex gap-2.5 overflow-x-auto scrollbar-refined pb-1">
                        {scenes.filter(s => s.status === 'completed').map((scene) => (
                          <DraggableMaterialItem
                            key={scene.id}
                            id={dndId('scene', scene.id)}
                            className="shrink-0 w-[130px] bg-[rgba(22,48,84,0.92)] rounded-xl cursor-grab active:cursor-grabbing hover:shadow-[0_0_16px_rgba(0,200,255,0.2)] hover:-translate-y-0.5 transition-all duration-150 border border-[rgba(0,200,255,0.14)] hover:border-[#00C8FF] overflow-hidden group shadow-sm"
                          >
                            <div className="aspect-[4/3] bg-[rgba(0,200,255,0.04)] overflow-hidden">
                              {scene.imageData ? (
                                <img
                                  src={scene.imageData}
                                  alt={scene.name}
                                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                  onClick={(e) => { e.stopPropagation(); setPreviewImage({ src: scene.imageData!, title: scene.name }); }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-2xl opacity-40">🏔️</span>
                                </div>
                              )}
                            </div>
                            <div className="px-2.5 py-2 flex items-center gap-1.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-[#B8D8F0] truncate font-medium leading-tight">{scene.name}</p>
                              </div>
                              <svg className="w-3 h-3 text-[#2E4F68] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                                <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                              </svg>
                            </div>
                          </DraggableMaterialItem>
                        ))}
                      </div>
                    )
                  )}

                  {/* Character Tab Content */}
                  {activeMaterialTab === 'character' && (
                    characters.filter(c => c.status === 'completed').length === 0 ? (
                      <button
                        onClick={() => router.push('/character')}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-[rgba(168,85,247,0.16)] text-[#2E4F68] text-xs hover:border-[#A855F7] hover:text-[#A855F7] hover:bg-[rgba(168,85,247,0.04)] transition-all duration-150"
                      >
                        暂无角色 — 点击去绘制
                      </button>
                    ) : (
                      <div className="flex gap-2.5 overflow-x-auto scrollbar-refined pb-1">
                        {characters.filter(c => c.status === 'completed').map((character) => (
                          <DraggableMaterialItem
                            key={character.id}
                            id={dndId('character', character.id)}
                            className="shrink-0 w-[84px] bg-[rgba(22,48,84,0.92)] rounded-xl cursor-grab active:cursor-grabbing hover:shadow-[0_0_16px_rgba(168,85,247,0.2)] hover:-translate-y-0.5 transition-all duration-150 border border-[rgba(168,85,247,0.14)] hover:border-[#A855F7] overflow-hidden group shadow-sm"
                          >
                            <div className="aspect-[3/4] bg-[rgba(168,85,247,0.04)] overflow-hidden">
                              {character.imageData ? (
                                <img
                                  src={character.imageData}
                                  alt={character.name}
                                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                  onClick={(e) => { e.stopPropagation(); setPreviewImage({ src: character.imageData!, title: character.name }); }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-xl opacity-40">👤</span>
                                </div>
                              )}
                            </div>
                            <div className="px-2 py-2 flex items-center gap-1">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-[#B8D8F0] truncate font-medium leading-tight">{character.name}</p>
                              </div>
                              <svg className="w-2.5 h-2.5 text-[#2E4F68] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                                <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                              </svg>
                            </div>
                          </DraggableMaterialItem>
                        ))}
                      </div>
                    )
                  )}

                  {/* Storyboard Tab Content */}
                  {activeMaterialTab === 'storyboard' && (
                    storyboardImages.filter(s => s.status === 'completed').length === 0 ? (
                      <div className="w-full py-4 rounded-xl border-2 border-dashed border-[rgba(255,107,26,0.16)] text-[#2E4F68] text-xs text-center">
                        暂无完成的分镜图，生成后将显示在此
                      </div>
                    ) : (
                      <div className="flex gap-2.5 overflow-x-auto scrollbar-refined pb-1">
                        {storyboardImages.filter(s => s.status === 'completed').map((storyboard) => (
                          <DraggableMaterialItem
                            key={storyboard.id}
                            id={dndId('storyboard', storyboard.id)}
                            className="shrink-0 w-[130px] bg-[rgba(22,48,84,0.92)] rounded-xl cursor-grab active:cursor-grabbing hover:shadow-[0_0_16px_rgba(255,107,26,0.2)] hover:-translate-y-0.5 transition-all duration-150 border border-[rgba(255,107,26,0.14)] hover:border-[#FF6B1A] overflow-hidden group shadow-sm"
                          >
                            <div className="aspect-[4/3] bg-[rgba(255,107,26,0.04)] overflow-hidden">
                              {storyboard.imageUrl ? (
                                <img
                                  src={storyboard.imageUrl}
                                  alt={storyboard.title}
                                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                  onClick={(e) => { e.stopPropagation(); setPreviewImage({ src: storyboard.imageUrl!, title: storyboard.title }); }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-2xl opacity-40">🖼️</span>
                                </div>
                              )}
                            </div>
                            <div className="px-2.5 py-2 flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-[#FF6B1A] shrink-0">{storyboard.sceneCode}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-[#B8D8F0] truncate font-medium leading-tight">{storyboard.title}</p>
                              </div>
                              <svg className="w-3 h-3 text-[#2E4F68] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                                <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                              </svg>
                            </div>
                          </DraggableMaterialItem>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}

          {/* Right - Storyboard Grid */}
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              {storyboardImages.map((image) => {
                const isGenerating = generatingIds.has(image.id);
                const isRegenerating = regeneratingIds.has(image.id);
                const isCompleted = image.status === 'completed';
                const isDropTarget = dropTargetId === image.id;
                const linkedScene = getLinkedScene(image);
                const linkedCharacters = getLinkedCharacters(image);
                const referencedStoryboard = getReferencedStoryboard(image);

                return (
                  <DroppableCardWrapper
                    key={image.id}
                    id={image.id}
                    className={cn(
                      'bg-[rgba(22,48,84,0.92)] backdrop-blur-xl rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-[0_0_16px_rgba(0,200,255,0.06)]',
                      isDropTarget ? 'border-[#FF6B1A] bg-[rgba(255,107,26,0.08)] shadow-[0_0_20px_rgba(255,107,26,0.2)]' : 'border-[rgba(0,200,255,0.16)]'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,200,255,0.12)] bg-[rgba(14,32,60,0.4)]">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-[#FF6B1A] text-white text-xs font-medium rounded-lg shadow-[0_0_8px_rgba(255,107,26,0.3)]">
                          {image.sceneCode}
                        </span>
                        <span className="text-[#E8F8FF] font-medium">{image.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span className="flex items-center gap-1 text-[#3BFF5A] text-xs font-medium">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            已生成
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStoryboard(image.id);
                          }}
                          className="p-1.5 rounded-lg text-[#2E4F68] hover:text-[#FF3D00] hover:bg-[rgba(255,61,0,0.1)] transition-all duration-150"
                          title="删除此分镜"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Scene metadata tags */}
                    {(() => {
                      const script = getMatchingScript(image);
                      if (!script) return null;
                      const tags: { label: string; color: string }[] = [];
                      if (script.weather) tags.push({ label: script.weather, color: 'bg-[rgba(0,200,255,0.12)] text-[#00C8FF] border border-[rgba(0,200,255,0.2)]' });
                      if (script.time) tags.push({ label: script.time, color: 'bg-[rgba(168,85,247,0.12)] text-[#A855F7] border border-[rgba(168,85,247,0.2)]' });
                      if (script.sceneLocation) tags.push({ label: script.sceneLocation, color: 'bg-[rgba(255,184,0,0.12)] text-[#FFB800] border border-[rgba(255,184,0,0.2)]' });
                      if (script.characters) tags.push({ label: script.characters, color: 'bg-[rgba(255,107,26,0.12)] text-[#FF6B1A] border border-[rgba(255,107,26,0.2)]' });
                      if (script.summary) tags.push({ label: script.summary, color: 'bg-[rgba(59,255,90,0.1)] text-[#3BFF5A] border border-[rgba(59,255,90,0.18)]' });
                      if (tags.length === 0) return null;
                      return (
                        <div className="px-4 py-2 border-b border-[rgba(0,200,255,0.1)] bg-[rgba(14,32,60,0.2)] flex flex-wrap gap-1.5">
                          {tags.map((tag, i) => (
                            <span key={i} className={`px-2 py-0.5 text-xs rounded-full ${tag.color}`}>
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Image Area */}
                    <div className="aspect-video bg-[rgba(0,200,255,0.03)] relative group">
                      {isCompleted && image.imageUrl ? (
                        <>
                          <img
                            src={image.imageUrl}
                            alt={image.title}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                            onClick={() => setPreviewImage({ src: image.imageUrl!, title: image.title })}
                          />
                          {/* 重新生成按钮 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRegenerateConfirm(image);
                            }}
                            className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs rounded-lg flex items-center gap-1.5 backdrop-blur-sm transition-all duration-150 active:scale-95"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M23 4v6h-6M1 20v-6h6" />
                              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                            </svg>
                            重新生成
                          </button>
                        </>
                      ) : isRegenerating ? (
                        <div className="w-full h-full flex items-center justify-center bg-[rgba(14,32,60,0.6)]">
                          <div className="text-center">
                            <div className="w-10 h-10 border-3 border-[#FF6B1A] border-t-transparent rounded-full animate-spin mx-auto mb-2 shadow-[0_0_12px_rgba(255,107,26,0.3)]" />
                            <p className="text-[#FF6B1A] text-sm font-medium">重新生成中...</p>
                          </div>
                        </div>
                      ) : isGenerating ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-12 h-12 border-3 border-[#00C8FF] border-t-transparent rounded-full animate-spin mx-auto mb-3 shadow-[0_0_12px_rgba(0,200,255,0.3)]" />
                            <p className="text-[#6B9AB5] text-sm">生成中...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <button
                            onClick={() => handleGenerateImage(image)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF6B1A] to-[#FFB800] text-white rounded-xl font-medium transition-all duration-150 shadow-[0_0_16px_rgba(255,107,26,0.3)] hover:shadow-[0_0_28px_rgba(255,107,26,0.45)] active:scale-95"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            生成分镜图片
                          </button>
                        </div>
                      )}

                      {/* Drop Zone Overlay */}
                      {isDropTarget && (
                        <div className="absolute inset-0 bg-[rgba(255,107,26,0.15)] flex items-center justify-center border-2 border-dashed border-[#FF6B1A] rounded-lg backdrop-blur-sm">
                          <p className="text-[#FF6B1A] font-medium">释放以添加参考素材</p>
                        </div>
                      )}
                    </div>

                    {/* Reference Materials Section - 参考素材区域 */}
                    <div className="px-4 py-3 border-b border-[rgba(0,200,255,0.1)] bg-[rgba(14,32,60,0.3)]">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-[#6B9AB5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="text-xs text-[#B8D8F0] font-medium">参考素材</span>
                        <span className="text-xs text-[#2E4F68]">拖入场景和角色</span>
                      </div>

                      <div className="flex gap-3">
                        {/* Reference Image - 场景或分镜（单个） */}
                        <div className="flex-shrink-0">
                          {(() => {
                            const ref = linkedScene || referencedStoryboard;
                            const type = linkedScene ? 'scene' : referencedStoryboard ? 'storyboard' : null;
                            const borderColor = type === 'scene' ? 'border-[#00C8FF]' : 'border-[#FF6B1A]';
                            const badgeColor = type === 'scene' ? 'bg-[#00C8FF]' : 'bg-[#FF6B1A]';
                            const badgeLabel = type === 'scene' ? '场景' : '分镜';
                            const name = type === 'scene' ? (linkedScene as Scene).name : type === 'storyboard' ? (referencedStoryboard as StoryboardImage).sceneCode : '';
                            const imgSrc = type === 'scene' ? (linkedScene as Scene).imageData : type === 'storyboard' ? (referencedStoryboard as StoryboardImage).imageUrl : null;
                            const imgTitle = type === 'scene' ? (linkedScene as Scene).name : type === 'storyboard' ? (referencedStoryboard as StoryboardImage).title : '';

                            if (ref) {
                              return (
                                <div className="relative">
                                  <div className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${borderColor} bg-[rgba(14,32,60,0.6)] shadow-sm cursor-pointer hover:opacity-80`}
                                    onClick={() => imgSrc && setPreviewImage({ src: imgSrc, title: imgTitle })}>
                                    {imgSrc ? (
                                      <img src={imgSrc} alt={imgTitle} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-[rgba(0,200,255,0.04)]">
                                        <span className="text-xl">{type === 'scene' ? '🏔️' : '🖼️'}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 ${badgeColor} rounded-md text-[10px] text-white max-w-[64px] truncate shadow-sm`}>
                                    {name}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveReferenceImage(image.id)}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF3D00] rounded-full flex items-center justify-center shadow-md hover:bg-[#FF5A3D] transition-colors"
                                  >
                                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-[rgba(0,200,255,0.16)] flex flex-col items-center justify-center cursor-pointer hover:border-[#00C8FF] hover:bg-[rgba(0,200,255,0.04)] transition-all duration-150">
                                <span className="text-[#2E4F68] text-lg">🖼️</span>
                                <span className="text-[10px] text-[#2E4F68] mt-0.5">场景或分镜</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Characters Reference - 角色参考（可多张） */}
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2">
                            {linkedCharacters.map((char) => (
                              <div key={char.id} className="relative">
                                <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-[#A855F7] bg-[rgba(14,32,60,0.6)] shadow-sm cursor-pointer hover:opacity-80"
                                  onClick={() => char.imageData && setPreviewImage({ src: char.imageData, title: char.name })}>
                                  {char.imageData ? (
                                    <img
                                      src={char.imageData}
                                      alt={char.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[rgba(168,85,247,0.06)]">
                                      <span className="text-xl">👤</span>
                                    </div>
                                  )}
                                </div>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[#A855F7] rounded-md text-[10px] text-white max-w-[64px] truncate shadow-sm">
                                  {char.name}
                                </div>
                                <button
                                  onClick={() => handleRemoveCharacter(image.id, char.id)}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF3D00] rounded-full flex items-center justify-center shadow-md hover:bg-[#FF5A3D] transition-colors"
                                >
                                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}

                            {/* Add Character Placeholder */}
                            <div
                              className="w-16 h-16 rounded-lg border-2 border-dashed border-[rgba(168,85,247,0.15)] flex flex-col items-center justify-center cursor-pointer hover:border-[#A855F7] hover:bg-[rgba(168,85,247,0.04)] transition-all duration-150"
                            >
                              <span className="text-[#2E4F68] text-lg">👤</span>
                              <span className="text-[10px] text-[#2E4F68] mt-0.5">角色</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prompt Area */}
                    <div className="p-4">
                      <label className="text-[#6B9AB5] text-xs mb-2 block">分镜内容</label>
                      <VoiceInput
                        value={image.prompt}
                        onChange={(newValue) => handleEditPrompt(image.id, newValue)}
                        placeholder="输入图片生成提示词..."
                        rows={6}
                      />
                    </div>
                  </DroppableCardWrapper>
                );
              })}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragItem ? (
            <div className="flex items-center gap-2 p-2 bg-[rgba(22,48,84,0.96)] backdrop-blur-xl rounded-lg shadow-[0_0_24px_rgba(255,107,26,0.3)] border-2 border-[#FF6B1A] w-44 opacity-95">
              {activeDragItem.type === 'scene' && (
                <>
                  <div className="w-10 h-10 rounded bg-[rgba(0,200,255,0.08)] overflow-hidden shrink-0">
                    {(activeDragItem.data as Scene).imageData ? (
                      <img src={(activeDragItem.data as Scene).imageData} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#2E4F68] text-xs">🏔️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E8F8FF] truncate font-medium">{(activeDragItem.data as Scene).name}</p>
                    <p className="text-xs text-[#00C8FF]">场景</p>
                  </div>
                </>
              )}
              {activeDragItem.type === 'character' && (
                <>
                  <div className="w-10 h-10 rounded-full bg-[rgba(168,85,247,0.08)] overflow-hidden shrink-0">
                    {(activeDragItem.data as Character).imageData ? (
                      <img src={(activeDragItem.data as Character).imageData} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#2E4F68] text-xs">👤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E8F8FF] truncate font-medium">{(activeDragItem.data as Character).name}</p>
                    <p className="text-xs text-[#A855F7]">角色</p>
                  </div>
                </>
              )}
              {activeDragItem.type === 'storyboard' && (
                <>
                  <div className="w-10 h-10 rounded bg-[rgba(255,107,26,0.08)] overflow-hidden shrink-0">
                    {(activeDragItem.data as StoryboardImage).imageUrl ? (
                      <img src={(activeDragItem.data as StoryboardImage).imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#2E4F68] text-xs">🖼️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E8F8FF] truncate font-medium">{(activeDragItem.data as StoryboardImage).sceneCode} {(activeDragItem.data as StoryboardImage).title}</p>
                    <p className="text-xs text-[#FF6B1A]">分镜图</p>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>

        {/* Bottom Actions */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={() => router.push('/character')}
            className="px-6 py-3 rounded-xl border-2 border-[rgba(0,200,255,0.2)] bg-[rgba(22,48,84,0.6)] text-[#B8D8F0] hover:border-[rgba(0,200,255,0.4)] hover:bg-[rgba(22,48,84,0.9)] hover:text-[#E8F8FF] transition-all duration-150 shadow-sm active:scale-95"
          >
            上一步
          </button>
          <button
            onClick={handleNext}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#FF6B1A] to-[#FFB800] text-white font-medium transition-all duration-150 shadow-[0_0_20px_rgba(255,107,26,0.35)] hover:shadow-[0_0_32px_rgba(255,107,26,0.5)] active:scale-95"
          >
            下一步：视频生成
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
