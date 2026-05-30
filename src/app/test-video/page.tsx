'use client';

import { useState } from 'react';

export default function VideoTestPage() {
  const [status, setStatus] = useState('');
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 通过代理的视频链接
  const proxyBase = 'https://16c7869c-1a55-442f-8e84-cb6104015e2e.dev.coze.site';
  const comfyuiVideo = 'https://sv-a367666e-b46e-409b-ace6-caabf1a46450-9001-x-defau-c1d8805f9f.sproxy.hd-01.alayanew.com:22443/api/view?filename=ltx2.3_flf2v_00020_.mp4&type=output&subfolder=video';
  const videoUrl = `${proxyBase}/api/video-proxy?url=${encodeURIComponent(comfyuiVideo)}`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a1a', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: 'white', fontSize: '24px', marginBottom: '20px' }}>视频播放测试</h1>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            padding: '10px 20px',
            backgroundColor: isPlaying ? '#ef4444' : '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {isPlaying ? '停止' : '开始播放'}
        </button>
      </div>
      
      <div style={{ position: 'relative', width: '100%', maxWidth: '800px', backgroundColor: 'black' }}>
        {isPlaying && (
          <video
            ref={(el) => {
              if (el) {
                el.play().catch(console.error);
              }
            }}
            src={videoUrl}
            controls
            preload="auto"
            style={{ width: '100%', display: 'block' }}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              setVideoInfo({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                readyState: video.readyState,
              });
              setStatus('视频加载成功！');
            }}
            onError={(e) => {
              const video = e.target as HTMLVideoElement;
              setStatus('视频加载失败: ' + (video.error?.message || '未知错误'));
            }}
            onCanPlay={() => setStatus('可以播放了！')}
          />
        )}
        
        {!isPlaying && (
          <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#333', color: 'white' }}>
            点击"开始播放"按钮
          </div>
        )}
      </div>

      {status && (
        <div style={{ marginTop: '20px', color: status.includes('成功') || status.includes('可以') ? '#4ade80' : '#f87171', padding: '10px', backgroundColor: status.includes('成功') || status.includes('可以') ? '#1a3a1a' : '#3a1a1a', borderRadius: '8px' }}>
          {status}
        </div>
      )}

      {videoInfo && (
        <div style={{ marginTop: '20px', color: 'white', padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
          <p>时长: {videoInfo.duration}秒</p>
          <p>尺寸: {videoInfo.width} x {videoInfo.height}</p>
          <p>就绪状态: {videoInfo.readyState} (0=无, 1=元数据, 2=当前帧, 3=未来帧, 4=足够)</p>
        </div>
      )}

      <div style={{ marginTop: '20px', color: '#888', fontSize: '12px' }}>
        <p>代理URL: {videoUrl}</p>
      </div>
    </div>
  );
}
