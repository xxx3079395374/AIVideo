'use client';

import { useState, createContext, useContext, ReactNode } from 'react';
import type { CreationState, CreationStep, ScriptScene, StoryboardImage, VideoTask, Character, Scene, RoleAssignment, ImageStyle, VideoGenerationMethod, VideoDuration } from '@/types';

interface CreationContextType extends CreationState {
  setCurrentStep: (step: CreationStep) => void;
  setOriginalText: (text: string) => void;
  setStyle: (style: ImageStyle) => void;
  setRoleAssignment: (roleAssignment: RoleAssignment) => void;
  setGeneratedScript: (scenes: ScriptScene[]) => void;
  updateScriptScene: (id: string, updates: Partial<ScriptScene>) => void;
  addScriptScene: (scene?: Partial<ScriptScene>) => void;
  deleteScriptScene: (id: string) => void;
  setStoryboardImages: (images: StoryboardImage[] | ((prev: StoryboardImage[]) => StoryboardImage[])) => void;
  updateStoryboardImage: (id: string, updates: Partial<StoryboardImage>) => void;
  addStoryboardImage: (image?: Partial<StoryboardImage>) => void;
  deleteStoryboardImage: (id: string) => void;
  setVideoTasks: (tasks: VideoTask[]) => void;
  addVideoTask: (task: VideoTask) => void;
  updateVideoTask: (id: string, updates: Partial<VideoTask>) => void;
  deleteVideoTask: (id: string) => void;
  setConcatenatedVideo: (url: string, count: number) => void;
  setIsConcatenating: (value: boolean) => void;
  setCharacters: (characters: Character[]) => void;
  addCharacter: (character: Character) => void;
  removeCharacter: (id: string) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  setScenes: (scenes: Scene[]) => void;
  addScene: (scene: Scene) => void;
  removeScene: (id: string) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  setSelectedStoryboard: (id?: string) => void;
  addCharacterToFixed: (character: Character) => void;
  removeCharacterFromFixed: (id: string) => void;
  addSceneToMain: (scene: Scene) => void;
  removeSceneFromMain: (id: string) => void;
  setVideoGenerationMethod: (method: VideoGenerationMethod) => void;
  setVideoTaskDuration: (id: string, duration: VideoDuration) => void;
}

const CreationContext = createContext<CreationContextType | undefined>(undefined);

export function CreationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CreationState>({
    currentStep: 'start',
    originalText: '',
    style: '3d-cartoon', // 默认 3D 卡通风格
    roleAssignment: undefined,
    generatedScript: [],
    storyboardImages: [],
    videoTasks: [],
    characters: [],
    scenes: [],
    selectedStoryboard: undefined,
    videoGenerationMethod: 'comfyui', // 默认使用 ComfyUI
    isConcatenating: false,
  });

  const setCurrentStep = (step: CreationStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const setOriginalText = (text: string) => {
    setState(prev => ({ ...prev, originalText: text }));
  };

  const setStyle = (style: ImageStyle) => {
    setState(prev => ({ ...prev, style }));
  };

  const setRoleAssignment = (roleAssignment: RoleAssignment) => {
    setState(prev => ({ ...prev, roleAssignment }));
  };

  const setGeneratedScript = (scenes: ScriptScene[]) => {
    setState(prev => ({ ...prev, generatedScript: scenes }));
  };

  const updateScriptScene = (id: string, updates: Partial<ScriptScene>) => {
    setState(prev => ({
      ...prev,
      generatedScript: prev.generatedScript.map(scene =>
        scene.id === id ? { ...scene, ...updates } : scene
      ),
    }));
  };

  const addScriptScene = (scene?: Partial<ScriptScene>) => {
    setState(prev => {
      const scenes = [...prev.generatedScript];
      const maxSceneNumber = scenes.reduce((max, s) => Math.max(max, s.sceneNumber), 0);
      const newScene: ScriptScene = {
        id: `scene-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        sceneNumber: maxSceneNumber + 1,
        sceneCode: `${maxSceneNumber + 1}`,
        title: scene?.title || '新场景',
        location: scene?.location || '未指定',
        summary: scene?.summary || '',
        sceneLocation: scene?.sceneLocation || '',
        time: scene?.time || '',
        weather: scene?.weather || '',
        characters: scene?.characters || '',
        description: scene?.description || '',
      };
      scenes.push(newScene);

      return { ...prev, generatedScript: scenes };
    });
  };

  const deleteScriptScene = (id: string) => {
    setState(prev => {
      const filtered = prev.generatedScript.filter(s => s.id !== id);
      // 重新编号
      const renumbered = filtered.map((scene, index) => ({
        ...scene,
        sceneNumber: index + 1,
      }));

      return { ...prev, generatedScript: renumbered };
    });
  };

  const setStoryboardImages = (storyboardImages: StoryboardImage[] | ((prev: StoryboardImage[]) => StoryboardImage[])) => {
    setState(prev => ({
      ...prev,
      storyboardImages: typeof storyboardImages === 'function' ? storyboardImages(prev.storyboardImages) : storyboardImages,
    }));
  };

  const updateStoryboardImage = (id: string, updates: Partial<StoryboardImage>) => {
    setState(prev => ({
      ...prev,
      storyboardImages: prev.storyboardImages.map(img =>
        img.id === id ? { ...img, ...updates } : img
      ),
    }));
  };

  const addStoryboardImage = (image?: Partial<StoryboardImage>) => {
    setState(prev => {
      const newId = `sb-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const maxSceneNumber = prev.storyboardImages.reduce((max, s) => Math.max(max, s.sceneNumber), prev.generatedScript.reduce((max, s) => Math.max(max, s.sceneNumber), 0));

      const newImage: StoryboardImage = {
        id: newId,
        sceneNumber: maxSceneNumber + 1,
        sceneCode: `${maxSceneNumber + 1}`,
        title: image?.title || '新分镜',
        prompt: image?.prompt || '',
        status: 'pending',
      };

      // 同步到剧本
      const newScene: ScriptScene = {
        id: newId,
        sceneNumber: maxSceneNumber + 1,
        sceneCode: `${maxSceneNumber + 1}`,
        title: image?.title || '新分镜',
        location: '未指定',
        summary: (image as any)?.summary || '',
        sceneLocation: (image as any)?.sceneLocation || '',
        time: (image as any)?.time || '',
        weather: (image as any)?.weather || '',
        characters: (image as any)?.characters || '',
        description: image?.prompt || '',
      };

      return {
        ...prev,
        storyboardImages: [...prev.storyboardImages, newImage],
        generatedScript: [...prev.generatedScript, newScene],
      };
    });
  };

  const deleteStoryboardImage = (id: string) => {
    setState(prev => {
      const sb = prev.storyboardImages
        .filter(img => img.id !== id)
        .map((img, index) => ({ ...img, sceneNumber: index + 1 }));

      const script = prev.generatedScript
        .filter(s => s.id !== id)
        .map((s, index) => ({ ...s, sceneNumber: index + 1 }));

      return { ...prev, storyboardImages: sb, generatedScript: script };
    });
  };

  const setVideoTasks = (videoTasks: VideoTask[]) => {
    setState(prev => ({ ...prev, videoTasks }));
  };

  const addVideoTask = (task: VideoTask) => {
    setState(prev => ({
      ...prev,
      videoTasks: [...prev.videoTasks, { ...task, duration: task.duration || 5 }],
    }));
  };

  const updateVideoTask = (id: string, updates: Partial<VideoTask>) => {
    setState(prev => ({
      ...prev,
      videoTasks: prev.videoTasks.map(task =>
        task.id === id ? { ...task, ...updates } : task
      ),
    }));
  };

  const setVideoTaskDuration = (id: string, duration: VideoDuration) => {
    setState(prev => ({
      ...prev,
      videoTasks: prev.videoTasks.map(task =>
        task.id === id ? { ...task, duration } : task
      ),
    }));
  };

  const deleteVideoTask = (id: string) => {
    setState(prev => ({
      ...prev,
      videoTasks: prev.videoTasks.filter(task => task.id !== id),
    }));
  };

  const setConcatenatedVideo = (url: string, count: number) => {
    setState(prev => ({
      ...prev,
      concatenatedVideoUrl: url,
      concatenatedVideoCount: count,
    }));
  };

  const setIsConcatenating = (value: boolean) => {
    setState(prev => ({ ...prev, isConcatenating: value }));
  };

  const setCharacters = (characters: Character[]) => {
    setState(prev => ({ ...prev, characters }));
  };

  const addCharacter = (character: Character) => {
    setState(prev => ({
      ...prev,
      characters: [...prev.characters, character],
    }));
  };

  const removeCharacter = (id: string) => {
    setState(prev => ({
      ...prev,
      characters: prev.characters.filter(c => c.id !== id),
    }));
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setState(prev => ({
      ...prev,
      characters: prev.characters.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  };

  const setScenes = (scenes: Scene[]) => {
    setState(prev => ({ ...prev, scenes }));
  };

  const addScene = (scene: Scene) => {
    setState(prev => ({
      ...prev,
      scenes: [...prev.scenes, scene],
    }));
  };

  const removeScene = (id: string) => {
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.filter(s => s.id !== id),
    }));
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(s =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  };

  const setSelectedStoryboard = (id?: string) => {
    setState(prev => ({ ...prev, selectedStoryboard: id }));
  };

  const addCharacterToFixed = (character: Character) => {
    setState(prev => ({
      ...prev,
      characters: prev.characters.map(c =>
        c.id === character.id ? { ...c, type: 'protagonist' as const } : c
      ),
    }));
  };

  const removeCharacterFromFixed = (id: string) => {
    setState(prev => ({
      ...prev,
      characters: prev.characters.map(c =>
        c.id === id ? { ...c, type: 'extra' as const } : c
      ),
    }));
  };

  const addSceneToMain = (scene: Scene) => {
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(s =>
        s.id === scene.id ? { ...s, type: 'main' as const } : s
      ),
    }));
  };

  const removeSceneFromMain = (id: string) => {
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(s =>
        s.id === id ? { ...s, type: 'secondary' as const } : s
      ),
    }));
  };

  const setVideoGenerationMethod = (method: VideoGenerationMethod) => {
    setState(prev => ({ ...prev, videoGenerationMethod: method }));
  };

  return (
    <CreationContext.Provider
      value={{
        ...state,
        setCurrentStep,
        setOriginalText,
        setStyle,
        setRoleAssignment,
        setGeneratedScript,
        updateScriptScene,
        addScriptScene,
        deleteScriptScene,
        setStoryboardImages,
        updateStoryboardImage,
        addStoryboardImage,
        deleteStoryboardImage,
        setVideoTasks,
        addVideoTask,
        updateVideoTask,
        deleteVideoTask,
        setConcatenatedVideo,
        setIsConcatenating,
        setCharacters,
        addCharacter,
        removeCharacter,
        updateCharacter,
        setScenes,
        addScene,
        removeScene,
        updateScene,
        setSelectedStoryboard,
        addCharacterToFixed,
        removeCharacterFromFixed,
        addSceneToMain,
        removeSceneFromMain,
        setVideoGenerationMethod,
        setVideoTaskDuration,
      }}
    >
      {children}
    </CreationContext.Provider>
  );
}

export function useCreation() {
  const context = useContext(CreationContext);
  if (!context) {
    throw new Error('useCreation must be used within a CreationProvider');
  }
  return context;
}
