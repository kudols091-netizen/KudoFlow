import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Connection, 
  Edge, 
  addEdge, 
  useNodesState, 
  useEdgesState, 
  MarkerType,
  ReactFlowProvider,
  Panel,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'motion/react';

// FIX: Bộ lọc lỗi toàn cục tối thượng cho ResizeObserver
// Lỗi này thường xảy ra khi React Flow cố gắng đo đạc kích thước node trong khi DOM đang có sự thay đổi (như CSS Transitions).
// Chúng ta cần chặn nó ở cấp độ window trước khi nó làm treo applet trong sandbox.
if (typeof window !== 'undefined') {
  const isResizeObserverError = (msg: any) => 
    typeof msg === 'string' && (
      msg.includes('ResizeObserver loop completed') || 
      msg.includes('ResizeObserver loop limit exceeded')
    );

  // 1. Chặn console.error
  const originalError = window.console.error;
  window.console.error = (...args) => {
    if (isResizeObserverError(args[0])) return;
    originalError.apply(window.console, args);
  };

  // 2. Chặn Error Event bubbling
  window.addEventListener('error', (e) => {
    if (isResizeObserverError(e.message)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  // 3. Chặn Unhandled Rejection (một số trình duyệt coi đây là promise rejection)
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message || e.reason;
    if (isResizeObserverError(msg)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  // 4. window.onerror truyền thống
  const prevOnError = window.onerror;
  window.onerror = (msg, url, line, col, error) => {
    if (isResizeObserverError(msg)) return true;
    if (prevOnError) return prevOnError(msg, url, line, col, error);
    return false;
  };
}

// Components
import { Sidebar } from './components/Sidebar';
import { UserGuide } from './components/UserGuide';

// Nodes
import { ProductNode } from './components/nodes/ProductNode';
import { CharacterNode } from './components/nodes/CharacterNode';
import { OutfitNode } from './components/nodes/OutfitNode';
import { LandscapeNode } from './components/nodes/LandscapeNode';
import { StoryBrancherNode } from './components/nodes/StoryBrancherNode';
import { GeminiNode } from './components/nodes/GeminiNode';
import { VideoNode } from './components/nodes/VideoNode';
import { TransitionNode } from './components/nodes/TransitionNode';
import { FilterNode } from './components/nodes/FilterNode';
import { ImageFilterNode } from './components/nodes/ImageFilterNode';
import { SubtitlesNode } from './components/nodes/SubtitleNode';
import { WatermarkNode } from './components/nodes/WatermarkNode';
import { ExportNode } from './components/nodes/ExportNode';
import { ImageNode } from './components/nodes/ImageNode';
import { StoryboardNode } from './components/nodes/StoryboardNode';
import { MusicNode } from './components/nodes/MusicNode';
import { MergeNode } from './components/nodes/MergeNode';
import { UpscaleNode } from './components/nodes/UpscaleNode';
import { StudioNode } from './components/nodes/StudioNode';
import { CharacterReferenceNode } from './components/nodes/CharacterReferenceNode';
import { CharacterGroupNode } from './components/nodes/CharacterGroupNode';
import { ReferenceGroupNode } from './components/nodes/ReferenceGroupNode';
import { MediaNode } from './components/nodes/MediaNode';
import { PromptNode } from './components/nodes/PromptNode';
import { VoiceNode } from './components/nodes/VoiceNode';

const nodeTypes = {
  productNode: ProductNode,
  characterNode: CharacterNode,
  outfitNode: OutfitNode,
  landscapeNode: LandscapeNode,
  storyBrancherNode: StoryBrancherNode,
  geminiNode: GeminiNode,
  videoNode: VideoNode,
  transitionNode: TransitionNode,
  filterNode: FilterNode,
  imageFilterNode: ImageFilterNode,
  subtitleNode: SubtitlesNode,
  watermarkNode: WatermarkNode,
  exportNode: ExportNode,
  imageNode: ImageNode,
  storyboardNode: StoryboardNode,
  musicNode: MusicNode,
  mergeNode: MergeNode,
  upscaleNode: UpscaleNode,
  studioNode: StudioNode,
  characterReferenceNode: CharacterReferenceNode,
  characterGroupNode: CharacterGroupNode,
  referenceGroupNode: ReferenceGroupNode,
  mediaNode: MediaNode,
  promptNode: PromptNode,
  voiceNode: VoiceNode,
};

const WORKFLOW_TEMPLATES: Record<string, any> = {
  fashionAFF: {
    name: "Siêu Luồng Viral TikTok Jessica",
    nodes: [
      { 
        id: 'prompt_img', 
        type: 'promptNode', 
        position: { x: -100, y: -100 }, 
        data: { 
          prompt: 'Visual Script: Jessica mặc váy lụa Champagne, đứng dạo bước trên phố Paris hoa lệ, ánh sáng vàng lúc hoàng hôn (golden hour), phong cách Vogue.',
          label: 'Kịch bản Hình ảnh' 
        } 
      },
      { 
        id: 'prompt_vid', 
        type: 'promptNode', 
        position: { x: 450, y: -100 }, 
        data: { 
          prompt: 'Motion Script: Jessica từ từ quay người lại mỉm cười với ống kính, tà váy lụa bay nhẹ trong gió Paris, máy quay quay chậm (slow motion) đầy nghệ thuật.',
          label: 'Kịch bản Chuyển động' 
        } 
      },
      { id: 'char0', type: 'characterNode', position: { x: -100, y: 250 }, data: { name: 'Jessica' } },
      { id: 'prod0', type: 'productNode', position: { x: -100, y: 750 }, data: { prompt: 'Váy lụa Satin cao cấp màu Champagne' } },
      { id: 'img0', type: 'imageNode', position: { x: 450, y: 350 }, data: { ratio: '9:16', model: '🍌 Nano Banana Pro' } },
      { id: 'vid0', type: 'videoNode', position: { x: 1000, y: 350 }, data: { duration: '8s', model: 'Omni Flash' } },
      { id: 'exp0', type: 'exportNode', position: { x: 1450, y: 350 }, data: { platform: 'TikTok (9:16)' } }
    ],
    edges: [
      { id: 'e_p_img_img', source: 'prompt_img', target: 'img0', targetHandle: 'prompt', animated: true, style: { stroke: '#60a5fa', strokeWidth: 3 } },
      { id: 'e_char_img', source: 'char0', target: 'img0', targetHandle: 'image', animated: true, style: { stroke: '#a855f7' } },
      { id: 'e_prod_img', source: 'prod0', target: 'img0', targetHandle: 'image', animated: true, style: { stroke: '#f97316' } },
      { id: 'e_p_vid_vid', source: 'prompt_vid', target: 'vid0', targetHandle: 'prompt', animated: true, style: { stroke: '#2dd4bf', strokeWidth: 3 } },
      { id: 'e_img_vid', source: 'img0', target: 'vid0', targetHandle: 'image', animated: true, style: { stroke: '#34A853' } },
      { id: 'e_vid_exp', source: 'vid0', target: 'exp0', animated: true, style: { stroke: '#fe2c55' } }
    ]
  }
};

const FlowEditor: React.FC = () => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [library, setLibrary] = useState<any[]>([]);
  const [toasts, setToasts] = useState<Array<{ id: string; msg: string; type: 'info' | 'success' | 'error' }>>([]);

  const addToast = useCallback((msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ 
      ...params, 
      animated: true,
      style: { stroke: '#fe2c55', strokeWidth: 2, filter: 'drop-shadow(0 0 5px rgba(254,44,85,0.4))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#fe2c55' }
    }, eds));
    addToast('Luồng dữ liệu đã được kết nối', 'info');
  }, [setEdges, addToast]);

  const addNode = useCallback((type: string, data = {}) => {
    const id = `${type}-${Date.now()}`;
    const newNode = {
      id,
      type,
      position: { x: 300 + Math.random() * 50, y: 300 + Math.random() * 50 },
      data: { 
        ...data, 
        addToLibrary: (item: any) => setLibrary(prev => [item, ...prev])
      }
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const applyTemplate = useCallback((key: string) => {
    const template = WORKFLOW_TEMPLATES[key];
    if (!template) return;
    
    const newNodes = template.nodes.map((n: any) => ({
      ...n,
      data: { 
        ...n.data, 
        addToLibrary: (item: any) => setLibrary(prev => [item, ...prev])
      }
    }));

    setNodes(newNodes);
    setEdges(template.edges.map((e: any) => ({
      ...e,
      animated: true,
      style: { ...e.style, strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, color: e.style?.stroke || '#fe2c55' }
    })));
    
    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
    addToast(`Đã tải: ${template.name}`, 'success');
  }, [setNodes, setEdges, addToast, fitView]);

  useEffect(() => {
    applyTemplate('fashionAFF');
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#0e0e0e] overflow-hidden font-sans select-none relative">
      {isSidebarOpen && (
        <Sidebar 
          libraryItems={library}
          onImportMedia={(items) => { setLibrary(prev => [...items, ...prev]); addToast(`Đã nhập ${items.length} file`, 'success'); }}
          onAddNode={addNode}
          onClose={() => setIsSidebarOpen(false)}
          onApplyTemplate={applyTemplate}
          onOpenGuide={() => setIsGuideOpen(true)}
        />
      )}

      <div className="flex-1 relative">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-6 left-6 z-10 w-12 h-12 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all shadow-2xl"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          colorMode="dark"
          fitView
          snapToGrid
          snapGrid={[10, 10]}
        >
          <Background color="#1a1a1a" gap={20} variant="dots" />
          <Controls className="!bg-[#1a1a1a] !border-white/10 !rounded-xl overflow-hidden" />
          
          <Panel position="top-right" className="flex gap-2">
            <button 
              onClick={() => fitView({ padding: 0.2, duration: 600 })}
              className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-2xl"
            >
              <span className="material-symbols-outlined text-[18px]">fit_screen</span>
              Fit View
            </button>
            <button 
              onClick={() => setIsGuideOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">school</span>
              Academy
            </button>
          </Panel>
        </ReactFlow>
      </div>

      <div className="fixed bottom-10 right-10 z-[20000] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`min-w-[200px] px-5 py-3 rounded-2xl border flex items-center gap-3 shadow-2xl backdrop-blur-xl ${
                t.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{t.type === 'success' ? 'check_circle' : 'info'}</span>
              <span className="text-[11px] font-black uppercase tracking-widest">{t.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <UserGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
