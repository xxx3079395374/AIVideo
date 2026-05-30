'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCreation } from '@/lib/store';
import { mockScriptScenes } from '@/lib/ai-service';
import { RoleHeader } from '@/components/role-header';
import type { ScriptScene } from '@/types';

export default function ScriptPage() {
  const router = useRouter();
  const { generatedScript, setGeneratedScript, setStoryboardImages } = useCreation();
  const [expandedId, setExpandedId] = useState<string | null>('1'); // 默认展开第一个
  const [editedScenes, setEditedScenes] = useState<Record<string, Partial<ScriptScene>>>({});

  // 如果没有生成剧本，使用模拟数据
  const scenes = generatedScript.length > 0 ? generatedScript : mockScriptScenes;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleFieldChange = (sceneId: string, field: keyof ScriptScene, value: string) => {
    setEditedScenes(prev => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId],
        [field]: value,
      },
    }));
  };

  const getSceneValue = (scene: ScriptScene, field: keyof ScriptScene): string => {
    if (editedScenes[scene.id]?.[field] !== undefined) {
      return editedScenes[scene.id][field] as string;
    }
    return (scene[field] as string) || '';
  };

  const handleCreateStoryboard = async () => {
    // 合并编辑后的数据
    const finalScenes = scenes.map(scene => ({
      ...scene,
      ...(editedScenes[scene.id] || {}),
    }));
    
    // 生成分镜图片数据
    setStoryboardImages(finalScenes.map((scene) => ({
      id: scene.id,
      sceneNumber: scene.sceneNumber,
      sceneCode: scene.sceneCode,
      title: scene.title,
      prompt: scene.description || '',
      status: 'pending' as const,
    })));
    router.push('/scene');
  };

  const handleDownloadScript = () => {
    const finalScenes = scenes.map(scene => ({
      ...scene,
      ...(editedScenes[scene.id] || {}),
    }));
    
    const content = finalScenes.map(s => {
      const envInfo = [s.weather, s.sceneLocation].filter(Boolean).join(' · ');
      return `【${s.sceneCode} ${s.title}】
环境：${envInfo || s.location}
简介：${s.summary || s.title}
${s.characters ? `人物：${s.characters}` : ''}
${s.description ? `\n${s.description}` : ''}
`;
    }).join('\n---\n');
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '剧本.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取环境信息显示
  const getEnvInfo = (scene: ScriptScene) => {
    const parts: string[] = [];
    if (scene.weather) parts.push(scene.weather);
    if (scene.sceneLocation) parts.push(scene.sceneLocation);
    return parts.length > 0 ? parts.join(' · ') : scene.location;
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <RoleHeader currentStep="script" />
      <div className="py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Main Container */}
        <div className="bg-[#1a1f2e] rounded-2xl overflow-hidden relative">
          {/* Scene Count Badge */}
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg">
              {scenes.length}场
            </span>
          </div>

          {/* Scrollable Scene List */}
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-4 pt-12">
            <div className="space-y-2">
              {scenes.map((scene) => {
                const isExpanded = expandedId === scene.id;
                const envInfo = getEnvInfo(scene);

                return (
                  <div
                    key={scene.id}
                    className="bg-[#252a3a] rounded-xl overflow-hidden transition-all duration-200"
                  >
                    {/* Scene Header - Clickable */}
                    <button
                      onClick={() => toggleExpand(scene.id)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-[#2a3040] transition-colors"
                    >
                      {/* Scene Number Badge */}
                      <div className="w-10 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                        <span className="text-white text-sm font-semibold">{scene.sceneCode}</span>
                      </div>

                      {/* Scene Title */}
                      <span className="text-white font-medium flex-1 text-left">
                        {scene.title}
                      </span>

                      {/* Environment Info */}
                      {envInfo && (
                        <span className="text-gray-400 text-sm mr-2">
                          {envInfo}
                        </span>
                      )}

                      {/* Expand Arrow */}
                      <svg
                        className={cn(
                          'w-5 h-5 text-gray-400 transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {/* Expanded Form */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* 简介 */}
                        <div className="space-y-1.5">
                          <label className="text-gray-400 text-sm">简介</label>
                          <input
                            type="text"
                            value={getSceneValue(scene, 'summary')}
                            onChange={(e) => handleFieldChange(scene.id, 'summary', e.target.value)}
                            placeholder="请输入简介"
                            className="w-full bg-[#1a1f2e] border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
                          />
                        </div>

                        {/* 场景 */}
                        <div className="space-y-1.5">
                          <label className="text-gray-400 text-sm">场景</label>
                          <input
                            type="text"
                            value={getSceneValue(scene, 'sceneLocation')}
                            onChange={(e) => handleFieldChange(scene.id, 'sceneLocation', e.target.value)}
                            placeholder="请输入场景"
                            className="w-full bg-[#1a1f2e] border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
                          />
                        </div>

                        {/* 时间 + 天气 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-gray-400 text-sm">时间</label>
                            <input
                              type="text"
                              value={getSceneValue(scene, 'time')}
                              onChange={(e) => handleFieldChange(scene.id, 'time', e.target.value)}
                              placeholder="请输入时间"
                              className="w-full bg-[#1a1f2e] border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-gray-400 text-sm">天气</label>
                            <input
                              type="text"
                              value={getSceneValue(scene, 'weather')}
                              onChange={(e) => handleFieldChange(scene.id, 'weather', e.target.value)}
                              placeholder="请输入天气"
                              className="w-full bg-[#1a1f2e] border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
                            />
                          </div>
                        </div>

                        {/* 人物 */}
                        <div className="space-y-1.5">
                          <label className="text-gray-400 text-sm">出场人物</label>
                          <input
                            type="text"
                            value={getSceneValue(scene, 'characters')}
                            onChange={(e) => handleFieldChange(scene.id, 'characters', e.target.value)}
                            placeholder="请输入出场人物"
                            className="w-full bg-[#1a1f2e] border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
                          />
                        </div>

                        {/* 内容 */}
                        <div className="space-y-1.5">
                          <label className="text-gray-400 text-sm">内容</label>
                          <textarea
                            value={getSceneValue(scene, 'description')}
                            onChange={(e) => handleFieldChange(scene.id, 'description', e.target.value)}
                            placeholder="请输入内容描述（画面、特写、氛围等）"
                            rows={5}
                            className="w-full bg-[#1a1f2e] border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-white/5 flex items-center justify-center gap-4">
            <button
              onClick={handleDownloadScript}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2a3040] text-gray-300 hover:text-white hover:bg-[#353b4d] transition-all duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              下载剧本
            </button>
            <button
              onClick={handleCreateStoryboard}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-white text-gray-900 font-medium hover:bg-gray-100 transition-all duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              制作分镜
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
