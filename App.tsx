import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Search, AudioWaveform, Plus, MessageCircle, Contact, Compass, User, X, Edit2, Check,
  Battery, BatteryCharging, Play, Pause, SkipForward, SkipBack, Music,
  ChevronRight, ShoppingBag, Star, Image as ImageIcon, CreditCard, Smile, Plug, Settings as SettingsIcon,
  Trash2, Upload, Link, RefreshCw, ChevronLeft, Users, CornerDownLeft, MessageSquarePlus, UserPlus, ChevronDown,
  Flower2, Gift, Send, Mic, Camera, BookOpen, Utensils, Video, Phone, RotateCcw, CheckCheck, Pin, PinOff, Clock, MapPin
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  id: string;
  avatar: string;
  name: string;
  time: string;
  message: string;
  isVip?: boolean;
  unread?: number;
  categories?: string[];
  isGroup?: boolean;
  realName?: string;
  signature?: string;
  persona?: string;
  isPinned?: boolean;
  background?: string;
  myAccountId?: string;
  timePerceptionEnabled?: boolean;
  aiTimezone?: string;
  userTimezone?: string;
}

export interface NavTab {
  id: string;
  label: string;
  isActive?: boolean;
}

export interface Song {
  title: string;
  artist: string;
  coverUrl: string;
  lyrics?: string;
}

export interface Account {
  id: string;
  name: string;
  avatar: string;
  persona: string;
  signature: string;
}

export interface Message {
  id: string;
  text: string;
  isMe: boolean;
  time: string;
}

// --- Constants ---
const NAV_TABS: NavTab[] = [
  { id: 'all', label: '全部', isActive: true },
  { id: 'love', label: '热恋' },
  { id: 'waiting', label: '待聊' },
  { id: 'private', label: '私密' },
  { id: 'group', label: '群聊' },
];

const CHAT_DATA: ChatMessage[] = [];

// --- StatusBar Component ---
interface StatusBarProps {
    theme?: 'dark' | 'light';
    className?: string;
    musicState?: {
        isPlaying: boolean;
        currentSong?: Song;
        isVisible?: boolean;
    };
    musicControls?: {
        onPlayPause: () => void;
        onNext: () => void;
        onPrev: () => void;
        onClose: () => void;
    };
    audioRef?: React.RefObject<HTMLAudioElement | null>;
    hidden?: boolean;
}

const parseLyrics = (lrcString?: string): { time: number; text: string }[] => {
    if (!lrcString) return [];
    const lines = lrcString.split('\n');
    const result: { time: number; text: string }[] = [];
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    const isLrc = lines.some(line => timeReg.test(line));

    if (!isLrc) return [];

    for (const line of lines) {
        const match = line.match(timeReg);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3]);
            const time = minutes * 60 + seconds + milliseconds / (match[3].length === 3 ? 1000 : 100);
            const text = line.replace(timeReg, '').trim();
            if (text) result.push({ time, text });
        }
    }
    return result;
};

const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const StatusBar: React.FC<StatusBarProps> = ({ 
    theme = 'dark' 
    , 
    className = '',
    musicState,
    musicControls,
    audioRef,
    hidden = false
}) => {
  const [time, setTime] = useState('');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [isIslandExpanded, setIsIslandExpanded] = useState(false);
  const [currentLyric, setCurrentLyric] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!musicState?.isVisible) {
        setIsIslandExpanded(false);
    }
  }, [musicState?.isVisible]);

  useEffect(() => {
    const audioEl = audioRef?.current;
    if (!audioEl) {
        setCurrentLyric('');
        return;
    }

    const parsed = musicState?.currentSong?.lyrics ? parseLyrics(musicState.currentSong.lyrics) : [];

    const handleTimeUpdate = () => {
        if (!isDraggingRef.current) {
            setCurrentTime(audioEl.currentTime);
        }
        setDuration(audioEl.duration || 0);

        if (parsed.length > 0) {
            const ct = audioEl.currentTime;
            let active;
            for (let i = parsed.length - 1; i >= 0; i--) {
                if (parsed[i].time <= ct) {
                    active = parsed[i];
                    break;
                }
            }
            setCurrentLyric(active ? active.text : '');
        } else {
            setCurrentLyric('');
        }
    };

    handleTimeUpdate();
    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('loadedmetadata', handleTimeUpdate);
    return () => {
        audioEl.removeEventListener('timeupdate', handleTimeUpdate);
        audioEl.removeEventListener('loadedmetadata', handleTimeUpdate);
    };
  }, [audioRef, musicState?.currentSong]);


  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef?.current) {
        audioRef.current.currentTime = newTime;
    }
  };

  const handleSeekStart = () => {
      isDraggingRef.current = true;
  };

  const handleSeekEnd = () => {
      isDraggingRef.current = false;
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timeInterval = setInterval(updateTime, 1000);

    let batteryCleanup: (() => void) | undefined;
    const initBattery = async () => {
      try {
        // @ts-ignore
        if (navigator.getBattery) {
          // @ts-ignore
          const battery = await navigator.getBattery();
          const updateBattery = () => {
            setBatteryLevel(battery.level);
            setIsCharging(battery.charging);
          };
          updateBattery();
          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);
          batteryCleanup = () => {
             battery.removeEventListener('levelchange', updateBattery);
             battery.removeEventListener('chargingchange', updateBattery);
          };
        } else {
            setBatteryLevel(1); 
        }
      } catch (e) {
        setBatteryLevel(1);
      }
    };
    initBattery();
    return () => {
      clearInterval(timeInterval);
      if (batteryCleanup) batteryCleanup();
    };
  }, []);

  if (hidden) return null;

  const textColor = theme === 'light' ? 'text-white' : 'text-stone-800';

  return (
    <>
      {isIslandExpanded && (
          <div className="fixed inset-0 z-[60] bg-transparent" onClick={() => setIsIslandExpanded(false)} />
      )}
      <div className={`flex justify-between items-center px-6 py-3 ${textColor} text-sm font-semibold select-none relative transition-colors duration-300 ${className} ${isIslandExpanded ? 'z-[70]' : 'z-[50]'}`}>
        <div className="tracking-wide text-xs font-medium z-10">{time}</div>
        
        {musicState?.isVisible && musicState.currentSong && (
            <div 
              className={`absolute left-1/2 -translate-x-1/2 top-2 bg-black text-white rounded-[32px] shadow-2xl cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${
                  isIslandExpanded 
                  ? 'w-[350px] h-[170px] px-6 py-5 cursor-default' 
                  : 'w-[90px] h-[28px] px-2 hover:scale-105 active:scale-95'
              }`}
              onClick={(e) => {
                  e.stopPropagation(); 
                  if (!isIslandExpanded) setIsIslandExpanded(true);
              }}
            >
                {musicState.currentSong.coverUrl && (
                    <div className="absolute inset-0 z-0 pointer-events-none">
                         <img src={musicState.currentSong.coverUrl} alt="blur-bg" className="w-full h-full object-cover opacity-50 blur-xl scale-150 transform translate-z-0" />
                         <div className="absolute inset-0 bg-black/20" />
                    </div>
                )}

                <div className="relative z-10 w-full h-full">
                    {!isIslandExpanded ? (
                        <div className="w-full h-full flex items-center justify-center gap-1.5 pointer-events-none">
                            <div className="flex gap-[3px] items-end h-3">
                                <div className={`w-[3px] bg-green-400 rounded-full ${musicState.isPlaying ? 'h-full animate-[bounce_1s_infinite]' : 'h-1'}`}></div>
                                <div className={`w-[3px] bg-green-400 rounded-full ${musicState.isPlaying ? 'h-2/3 animate-[bounce_1.2s_infinite]' : 'h-1'}`}></div>
                                <div className={`w-[3px] bg-green-400 rounded-full ${musicState.isPlaying ? 'h-full animate-[bounce_0.8s_infinite]' : 'h-1'}`}></div>
                                <div className={`w-[3px] bg-green-400 rounded-full ${musicState.isPlaying ? 'h-1/2 animate-[bounce_0.6s_infinite]' : 'h-1'}`}></div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3.5 overflow-hidden">
                                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden">
                                        {musicState.currentSong.coverUrl ? (
                                            <img src={musicState.currentSong.coverUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <Music size={22} className="text-white/80" />
                                        )}
                                    </div>
                                    <div className="flex flex-col overflow-hidden min-w-0 pr-2">
                                        <span className="text-[15px] font-bold truncate text-white leading-tight">{musicState.currentSong.title}</span>
                                        <span className="text-xs text-white/60 truncate leading-tight mt-0.5">{musicState.currentSong.artist}</span>
                                    </div>
                                </div>
                                <button 
                                  onClick={(e) => { 
                                      e.stopPropagation(); 
                                      musicControls?.onClose();
                                      setIsIslandExpanded(false);
                                  }}
                                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors -mr-1 shrink-0"
                                >
                                   <X size={18} className="text-white/90" />
                                </button>
                            </div>
                            
                            <div className="w-full flex items-center justify-center h-8 my-1 px-1 overflow-hidden">
                                <p className="text-[15px] font-medium text-green-300 truncate text-center opacity-90 animate-in fade-in slide-in-from-bottom-1 w-full">
                                    {currentLyric || "..."}
                                </p>
                            </div>

                            <div className="w-full flex items-center gap-3 mb-3 px-1" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] text-white/60 font-mono w-8 text-right shrink-0">{formatTime(currentTime)}</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    onMouseDown={handleSeekStart}
                                    onMouseUp={handleSeekEnd}
                                    onTouchStart={handleSeekStart}
                                    onTouchEnd={handleSeekEnd}
                                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                                />
                                <span className="text-[10px] text-white/60 font-mono w-8 shrink-0">{formatTime(duration)}</span>
                            </div>

                            <div className="flex items-center justify-center gap-10">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); musicControls?.onPrev(); }}
                                   className="text-white hover:text-white/80 transition-colors active:scale-90 p-1"
                                 >
                                     <SkipBack size={24} fill="currentColor" />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); musicControls?.onPlayPause(); }}
                                   className="text-white hover:text-green-400 transition-colors active:scale-90 p-1"
                                 >
                                     {musicState.isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); musicControls?.onNext(); }}
                                   className="text-white hover:text-white/80 transition-colors active:scale-90 p-1"
                                 >
                                     <SkipForward size={24} fill="currentColor" />
                                 </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        <div className="flex items-center space-x-1.5 z-10">
          <div className="flex items-center gap-1">
              {batteryLevel !== null && (
                  <span className="text-[10px] font-bold">{Math.round(batteryLevel * 100)}%</span>
              )}
              <div className="relative">
                  {isCharging ? (
                      <BatteryCharging size={20} />
                  ) : (
                      <Battery size={20} />
                  )}
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

// --- Chat Interface Component ---
interface ChatInterfaceProps {
  chat: ChatMessage;
  account: Account;
  onBack: () => void;
  messages: Message[];
  onSend: (text: string) => void;
  onDeleteChat: () => void;
  onClearHistory: () => void;
  onTogglePin: () => void;
  onUpdateChat: (updates: Partial<ChatMessage>) => void;
  accounts: Account[];
  onSwitchAccount: (id: string) => void;
  onOpenBackgroundPicker: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chat, account, onBack, messages, onSend, onDeleteChat, onClearHistory, onTogglePin, onUpdateChat, accounts, onSwitchAccount, onOpenBackgroundPicker }) => {
    const [input, setInput] = useState('');
    const [isPlusOpen, setIsPlusOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [remarkName, setRemarkName] = useState(chat.name);
    const [summaryRange, setSummaryRange] = useState(50);
    const [summaryPerspective, setSummaryPerspective] = useState('third');
    const [customSummaryPrompt, setCustomSummaryPrompt] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [isDeleteFriendModalOpen, setIsDeleteFriendModalOpen] = useState(false);
    const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isPlusOpen]);

    useEffect(() => {
        setRemarkName(chat.name);
    }, [chat.name]);
  
    const handleGenerateSummary = async () => {
        if (!process.env.API_KEY) {
            alert("请先配置 API Key");
            return;
        }
        
        setIsGeneratingSummary(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const historyToSummarize = messages.slice(-summaryRange).map(m => `${m.isMe ? 'User' : chat.name}: ${m.text}`).join('\n');
            
            let prompt = "";
            if (summaryPerspective === 'custom') {
                prompt = `
                基于以下聊天记录，根据提示词"${customSummaryPrompt}"进行总结。
                
                聊天记录：
                ${historyToSummarize}
                
                要求：
                1. 字数在300-2000字之间。
                2. 深度总结对话内容、情感变化和关键信息。
                `;
            } else if (summaryPerspective === 'contact') {
                prompt = `
                你现在是"${chat.name}"，人设是"${chat.persona || '未设定'}"。
                请以你的视角（${chat.name}）来回顾和总结这段与用户的对话。
                
                聊天记录：
                ${historyToSummarize}
                
                要求：
                1. 字数在300-2000字之间。
                2. 完全沉浸在角色中，表达你的真实感受、对用户的看法以及你们关系的发展。
                3. 口语化，符合你的人设。
                `;
            } else {
                const perspective = summaryPerspective === 'first' ? '第一人称（用户）' : '第三人称（旁观者）';
                prompt = `
                请以${perspective}视角总结以下聊天记录。
                
                聊天记录：
                ${historyToSummarize}
                
                要求：
                1. 字数在300-2000字之间。
                2. 深度分析对话脉络、双方意图和情感走向。
                `;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt
            });
            
            const summary = response.text?.trim();
            if (summary) {
                // In a real app, this would save to WorldBookApp.tsx
                console.log("Saving to World Book:", summary); 
                alert("记忆总结已成功生成并保存在世界书中！");
            }
        } catch (error) {
            console.error("Summary generation failed", error);
            alert("生成总结失败，请重试");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleSend = () => {
      if (!input.trim()) return;
      onSend(input);
      setInput('');
    };

    const MORE_MENU_ITEMS = [
        { icon: ImageIcon, label: '图片' },
        { icon: Camera, label: '拍摄' },
        { icon: Smile, label: '表情' },
        { icon: Mic, label: '语音' },
        { icon: CreditCard, label: '转账' },
        { icon: Utensils, label: '外卖' },
        { icon: ShoppingBag, label: '购物' },
        { icon: Video, label: '视频通话' },
        { icon: Phone, label: '语音通话' },
        { icon: MapPin, label: '线下' },
        { icon: RotateCcw, label: '重回' },
    ];

    return (
        <div className="absolute inset-0 z-40 bg-[#f8f9fb] flex flex-col h-full animate-in slide-in-from-right duration-300">
            {/* Custom Header */}
            <div className="h-[105px] bg-white/90 backdrop-blur-md flex items-end justify-between px-4 pb-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] z-50">
                <button 
                  onClick={onBack} 
                  className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform"
                >
                    <ChevronLeft className="text-gray-400 w-8 h-8" strokeWidth={1.5} />
                </button>

                <div className="flex flex-col items-center pb-1">
                    <span className="text-[16px] font-bold text-gray-800 tracking-wide font-mono">
                        {chat.name}
                    </span>
                    <span className="text-[9px] text-gray-400 tracking-wider">
                        {chat.isGroup ? 'Group Chat' : 'Mobile Online'}
                    </span>
                </div>

                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform"
                >
                     <SettingsIcon className="text-gray-400 w-6 h-6" strokeWidth={1.5} />
                </button>
            </div>

            {/* Chat Settings Modal */}
            {isSettingsOpen && (
                <div className="absolute inset-0 z-[60] bg-[#f2f4f7] flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="h-[105px] bg-white/90 backdrop-blur-md flex items-end justify-between px-4 pb-3 shadow-sm z-50 shrink-0">
                        <button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform">
                            <ChevronLeft className="text-gray-800 w-6 h-6" />
                        </button>
                        <span className="text-[17px] font-bold text-gray-900 pb-2">聊天设置</span>
                        <div className="w-10"></div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                        
                        {/* Edit Remark Name */}
                        <div className="bg-white rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Edit2 size={16} className="text-gray-900" />
                                <span className="text-[15px] font-bold text-gray-900">备注名修改</span>
                            </div>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    value={remarkName}
                                    onChange={(e) => setRemarkName(e.target.value)}
                                    className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none border border-transparent focus:border-gray-200 transition-all"
                                />
                                <button 
                                    onClick={() => onUpdateChat({ name: remarkName })}
                                    className="bg-[#5f5f5f] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#4a4a4a] transition-colors shadow-lg shadow-black/20"
                                >
                                    保存
                                </button>
                            </div>
                        </div>

                        {/* Chat Background */}
                        <div className="bg-white rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <ImageIcon size={16} className="text-gray-900" />
                                <span className="text-[15px] font-bold text-gray-900">聊天背景设置</span>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-20 h-24 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-xs text-gray-400 overflow-hidden relative">
                                    {chat.background ? (
                                        <img src={chat.background} className="w-full h-full object-cover" />
                                    ) : (
                                        "默认"
                                    )}
                                    {chat.background && (
                                        <button 
                                            onClick={() => onUpdateChat({ background: undefined })}
                                            className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white hover:bg-black/70"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                                <button 
                                    onClick={onOpenBackgroundPicker}
                                    className="h-9 px-4 bg-gray-50 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors self-center"
                                >
                                    选择图片
                                </button>
                            </div>
                        </div>

                        {/* Memory Summary */}
                        <div className="bg-white rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpen size={16} className="text-gray-900" />
                                <span className="text-[15px] font-bold text-gray-900">记忆总结</span>
                            </div>
                            
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-gray-500 mb-2">
                                    <span>总结范围</span>
                                    <span>最近 {summaryRange} 条</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="10" 
                                    max={Math.min(messages.length, 500) || 50} 
                                    value={summaryRange}
                                    onChange={(e) => setSummaryRange(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#5f5f5f] [&::-webkit-slider-thumb]:rounded-full" 
                                />
                            </div>

                            <div className="mb-4">
                                <div className="text-xs text-gray-500 mb-2">总结视角</div>
                                <div className="relative">
                                    <select 
                                        value={summaryPerspective}
                                        onChange={(e) => setSummaryPerspective(e.target.value)}
                                        className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none appearance-none font-medium"
                                    >
                                        <option value="third">第三人称视角</option>
                                        <option value="first">第一人称视角</option>
                                        <option value="contact">{chat.name} 视角</option>
                                        <option value="custom">自定义总结</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {summaryPerspective === 'custom' && (
                                <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="text-xs text-gray-500 mb-2">自定义提示词</div>
                                    <textarea 
                                        value={customSummaryPrompt}
                                        onChange={(e) => setCustomSummaryPrompt(e.target.value)}
                                        placeholder="请输入您想要总结的方向或重点..."
                                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none resize-none h-24 border border-transparent focus:border-gray-200 transition-all"
                                    />
                                </div>
                            )}

                            <button 
                                onClick={handleGenerateSummary}
                                disabled={isGeneratingSummary || (summaryPerspective === 'custom' && !customSummaryPrompt.trim())}
                                className="w-full bg-[#5f5f5f] text-white font-bold py-3 rounded-xl hover:bg-[#4a4a4a] transition-colors shadow-lg shadow-black/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGeneratingSummary ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" /> 正在生成...
                                    </>
                                ) : (
                                    <>
                                        <BookOpen size={16} /> 开始总结并保存
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Time Perception */}
                        <div className="bg-white rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-gray-900" />
                                    <span className="text-[15px] font-bold text-gray-900">时间感应</span>
                                </div>
                                <div 
                                    onClick={() => onUpdateChat({ timePerceptionEnabled: !chat.timePerceptionEnabled })}
                                    className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${chat.timePerceptionEnabled ? 'bg-[#5f5f5f]' : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${chat.timePerceptionEnabled ? 'left-6' : 'left-1'}`}></div>
                                </div>
                            </div>
                            
                            {chat.timePerceptionEnabled && (
                                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1.5">AI 时区</div>
                                        <div className="relative">
                                            <select 
                                                value={chat.aiTimezone || 'Asia/Shanghai'}
                                                onChange={(e) => onUpdateChat({ aiTimezone: e.target.value })}
                                                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-900 outline-none appearance-none"
                                            >
                                                <option value="Asia/Shanghai">Asia/Shanghai</option>
                                                <option value="America/New_York">America/New_York</option>
                                                <option value="Europe/London">Europe/London</option>
                                                <option value="Asia/Tokyo">Asia/Tokyo</option>
                                                <option value="Australia/Sydney">Australia/Sydney</option>
                                                <option value="Europe/Paris">Europe/Paris</option>
                                                <option value="America/Los_Angeles">America/Los_Angeles</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1.5">用户时区</div>
                                        <div className="relative">
                                            <select 
                                                value={chat.userTimezone || 'Asia/Shanghai'}
                                                onChange={(e) => onUpdateChat({ userTimezone: e.target.value })}
                                                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-900 outline-none appearance-none"
                                            >
                                                <option value="Asia/Shanghai">Asia/Shanghai</option>
                                                <option value="America/New_York">America/New_York</option>
                                                <option value="Europe/London">Europe/London</option>
                                                <option value="Asia/Tokyo">Asia/Tokyo</option>
                                                <option value="Australia/Sydney">Australia/Sydney</option>
                                                <option value="Europe/Paris">Europe/Paris</option>
                                                <option value="America/Los_Angeles">America/Los_Angeles</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status Update Frequency */}
                        <div className="bg-white rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <RefreshCw size={16} className="text-gray-900" />
                                <span className="text-[15px] font-bold text-gray-900">状态更新频率</span>
                            </div>
                            <div className="flex bg-gray-50 p-1 rounded-xl">
                                <button className="flex-1 py-2 text-xs font-bold text-gray-900 bg-white rounded-lg shadow-sm">每 1 轮</button>
                                <button className="flex-1 py-2 text-xs font-medium text-gray-500 hover:text-gray-700">每 3 轮</button>
                                <button className="flex-1 py-2 text-xs font-medium text-gray-500 hover:text-gray-700">每 5 轮</button>
                            </div>
                        </div>

                        {/* Account Switch */}
                        <div className="bg-white rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Users size={16} className="text-gray-900" />
                                <span className="text-[15px] font-bold text-gray-900">账号切换</span>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                {accounts.map(acc => (
                                    <div 
                                        key={acc.id} 
                                        onClick={() => onSwitchAccount(acc.id)}
                                        className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0"
                                    >
                                        <div className={`w-12 h-12 rounded-full p-0.5 ${account.id === acc.id ? 'border-2 border-black' : 'border border-gray-100'}`}>
                                            <img src={acc.avatar} className="w-full h-full rounded-full object-cover" />
                                        </div>
                                        <span className={`text-[10px] font-medium truncate max-w-[60px] ${account.id === acc.id ? 'text-black' : 'text-gray-500'}`}>{acc.name}</span>
                                    </div>
                                ))}
                                <div className="flex flex-col items-center gap-1.5 opacity-50 flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full border border-dashed border-gray-300 flex items-center justify-center">
                                        <Plus size={20} className="text-gray-400" />
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-400">添加</span>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button 
                            onClick={() => setIsSettingsOpen(false)}
                            className="w-full bg-[#5f5f5f] text-white font-bold py-4 rounded-2xl hover:bg-[#4a4a4a] shadow-xl shadow-black/10 transition-all text-base mt-2"
                        >
                            保存并返回
                        </button>

                        {/* Danger Zone */}
                        <div className="flex flex-col gap-3 mt-4">
                            <button 
                                onClick={() => setIsClearHistoryModalOpen(true)}
                                className="w-full bg-white text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-all text-sm border border-gray-100"
                            >
                                清空聊天记录
                            </button>
                            <button 
                                onClick={() => setIsDeleteFriendModalOpen(true)}
                                className="w-full bg-red-50 text-red-500 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all text-sm"
                            >
                                删除好友
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Delete Friend Modal */}
            {isDeleteFriendModalOpen && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm px-8 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">删除好友</h3>
                        <p className="text-sm text-gray-500 text-center mb-6">确认要删除该好友吗？删除后将无法恢复，且聊天记录也会一并清除。</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteFriendModalOpen(false)} className="flex-1 bg-gray-100 text-gray-900 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors text-sm">取消</button>
                            <button onClick={() => { setIsDeleteFriendModalOpen(false); onDeleteChat(); }} className="flex-1 bg-red-500 text-white font-bold py-3.5 rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all text-sm">确认删除</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear History Modal */}
            {isClearHistoryModalOpen && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm px-8 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">清空聊天记录</h3>
                        <p className="text-sm text-gray-500 text-center mb-6">确认要清空所有聊天记录吗？清空后AI将失去这段记忆，且无法恢复。</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsClearHistoryModalOpen(false)} className="flex-1 bg-gray-100 text-gray-900 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors text-sm">取消</button>
                            <button onClick={() => { setIsClearHistoryModalOpen(false); onClearHistory(); setIsSettingsOpen(false); }} className="flex-1 bg-red-500 text-white font-bold py-3.5 rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all text-sm">确认清空</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Body */}
            <div 
                className="flex-1 overflow-y-auto p-4 bg-[#f2f4f7] relative bg-cover bg-center transition-all duration-500"
                style={{ backgroundImage: chat.background ? `url(${chat.background})` : 'none' }}
            >
                 <div className="relative z-10 flex flex-col gap-2 pt-2">
                     {messages.length > 0 && (
                         <div className="flex justify-center mb-4">
                             <span className="bg-gray-200/50 text-gray-400 text-[10px] px-2 py-0.5 rounded-full">
                                 {messages[0].time}
                             </span>
                         </div>
                     )}

                     {messages.map((msg, idx) => (
                         <div key={idx} className={`flex items-start gap-2 mb-4 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                             <div className="flex-shrink-0 flex flex-col items-center">
                                 <img 
                                     src={msg.isMe ? account.avatar : chat.avatar} 
                                     className="w-10 h-10 rounded-full object-cover shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-white/50"
                                 />
                             </div>
                             
                             <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                 {!msg.isMe && (
                                     <span className="text-[10px] text-gray-400 mb-1 ml-1.5">{chat.name}</span>
                                 )}
                                 <div className={`
                                     relative px-4 py-2.5 text-[15px] leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-end gap-1.5 group
                                     ${msg.isMe 
                                         ? 'bg-[#808080] text-white rounded-2xl rounded-br-sm' 
                                         : 'bg-[#f2f2f2] text-gray-900 rounded-2xl rounded-bl-sm'
                                     }
                                 `}>
                                     {msg.isMe ? (
                                        <>
                                           <div className="flex items-center gap-0.5 opacity-40 select-none shrink-0 mb-[1px] tracking-tighter">
                                              <span className="text-[9px] font-bold">{msg.time}</span>
                                           </div>
                                           <div className="break-words min-w-0 text-justify break-all">
                                               {msg.text}
                                           </div>
                                        </>
                                     ) : (
                                        <>
                                           <div className="break-words min-w-0 text-justify break-all">
                                               {msg.text}
                                           </div>
                                           <div className="flex items-center gap-0.5 opacity-40 select-none shrink-0 mb-[1px] tracking-tighter">
                                                <span className="text-[9px] font-bold">{msg.time}</span>
                                           </div>
                                        </>
                                     )}
                                 </div>
                             </div>
                         </div>
                     ))}
                     <div ref={scrollRef} />
                 </div>
            </div>

            {/* Footer */}
            <div className="min-h-[85px] bg-[#f9f9f9] border-t border-gray-100 flex items-center px-4 gap-3 relative overflow-hidden shrink-0 pb-6 pt-3">
                <button 
                  onClick={() => setIsPlusOpen(!isPlusOpen)}
                  className={`relative z-10 w-9 h-9 flex items-center justify-center bg-white rounded-full border border-gray-200 shadow-sm active:scale-95 transition-all duration-300 ${isPlusOpen ? 'rotate-45' : ''}`}
                >
                    <Plus className="text-gray-400 w-5 h-5" />
                </button>

                <div className="flex-1 relative z-10">
                    <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="w-full h-10 rounded-full border-none outline-none bg-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] px-5 text-sm text-gray-800 placeholder-gray-400"
                        placeholder=""
                    />
                </div>

                <div className="relative z-10 flex items-center gap-4 pl-1">
                    <button className="active:scale-90 transition-transform">
                        <Star className="text-gray-400 w-6 h-6" />
                    </button>
                    <button onClick={handleSend} className="active:scale-90 transition-transform">
                        <Send className="text-gray-400 w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* More Panel */}
            {isPlusOpen && (
                <div className="bg-[#f2f4f7] border-t border-gray-100 px-6 py-8 h-[280px] shrink-0 animate-in slide-in-from-bottom-10 duration-300 overflow-y-auto no-scrollbar shadow-inner">
                    <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                        {MORE_MENU_ITEMS.map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-2 cursor-pointer active:opacity-60 transition-opacity">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-gray-600 border border-gray-50">
                                    <item.icon size={26} strokeWidth={1.5} className="text-gray-500" />
                                </div>
                                <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- App Component ---
const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([
    { id: '1', name: '甜甜子', avatar: 'https://picsum.photos/100/100?random=1', persona: '可爱的萌妹子', signature: '正在热恋中' }
  ]);
  const [currentAccountId, setCurrentAccountId] = useState('1');
  const currentAccount = accounts.find(a => a.id === currentAccountId) || accounts[0];

  const [chats, setChats] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('qq_chats');
    return saved ? JSON.parse(saved) : CHAT_DATA;
  });
  
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>(() => {
    const saved = localStorage.getItem('qq_chatHistory');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeChat, setActiveChat] = useState<ChatMessage | null>(null);

  const [tabs, setTabs] = useState<NavTab[]>(NAV_TABS);
  const [activeTabId, setActiveTabId] = useState('all');
  const [activeBottomTab, setActiveBottomTab] = useState('weixin');
  const [statusText, setStatusText] = useState(currentAccount.signature);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      localStorage.setItem('qq_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
      localStorage.setItem('qq_chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    setStatusText(currentAccount.signature);
  }, [currentAccount]);

  const [subStatusText, setSubStatusText] = useState('刚刚来过');
  const [isSubStatusModalOpen, setIsSubStatusModalOpen] = useState(false);
  const [tempSubStatusText, setTempSubStatusText] = useState('');
  const [isTabManagerOpen, setIsTabManagerOpen] = useState(false);
  const [editingTabs, setEditingTabs] = useState<NavTab[]>([]);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  const [isDetailedAddContactOpen, setIsDetailedAddContactOpen] = useState(false);
  const [contactAvatar, setContactAvatar] = useState('');
  const [contactRealName, setContactRealName] = useState('');
  const [contactRemark, setContactRemark] = useState('');
  const [contactSignature, setContactSignature] = useState('');
  const [contactPersona, setContactPersona] = useState('');
  const [contactCategory, setContactCategory] = useState('waiting');
  const [isAddingContact, setIsAddingContact] = useState(false);

  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [tempAccountName, setTempAccountName] = useState('');
  const [tempAccountAvatar, setTempAccountAvatar] = useState('');
  const [tempAccountPersona, setTempAccountPersona] = useState('');
  const [tempAccountSignature, setTempAccountSignature] = useState('');
  
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [isProfilePageOpen, setIsProfilePageOpen] = useState(false);
  const [avatarPickerTarget, setAvatarPickerTarget] = useState<'account' | 'contact' | 'contact_edit' | 'chat_bg'>('account');
  const [isUrlInputMode, setIsUrlInputMode] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewingContact, setViewingContact] = useState<ChatMessage | null>(null);
  const [isContactDetailOpen, setIsContactDetailOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState('');
  const [editingContactName, setEditingContactName] = useState('');
  const [editingContactRealName, setEditingContactRealName] = useState('');
  const [editingContactSignature, setEditingContactSignature] = useState('');
  const [editingContactAvatar, setEditingContactAvatar] = useState('');
  const [isGeneratingContactPersona, setIsGeneratingContactPersona] = useState(false);
  
  const [isLongPressMenuOpen, setIsLongPressMenuOpen] = useState(false);
  const [longPressChat, setLongPressChat] = useState<ChatMessage | null>(null);
  const pressTimer = useRef<NodeJS.Timeout>(null);
  const isLongPress = useRef(false);

  const contactCount = chats.length;
  const badgeText = contactCount > 99 ? '99+' : `+${contactCount}`;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const saveSubStatus = () => {
    if (tempSubStatusText.trim()) {
      setSubStatusText(tempSubStatusText);
    }
    setIsSubStatusModalOpen(false);
  };

  const getFilteredChats = () => {
    let result = activeTabId === 'all' ? chats :
                 activeTabId === 'group' ? chats.filter(chat => chat.isGroup) :
                 chats.filter(chat => chat.categories?.includes(activeTabId));
    
    // Sort by isPinned (true first), then keep original order
    return result.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
    });
  };

  const filteredChats = getFilteredChats();

  const openTabManager = () => {
    setEditingTabs(JSON.parse(JSON.stringify(tabs)));
    setIsTabManagerOpen(true);
  };

  const saveTabChanges = () => {
    setTabs(editingTabs);
    setIsTabManagerOpen(false);
  };

  const updateTabName = (id: string, newName: string) => {
    setEditingTabs(prev => prev.map(t => t.id === id ? { ...t, label: newName } : t));
  };

  const addNewTab = () => {
    const newId = `custom_${Date.now()}`;
    setEditingTabs(prev => [...prev, { id: newId, label: '新分组', isActive: false }]);
  };

  const openAddContactModal = () => {
    setIsPlusMenuOpen(false);
    setContactAvatar(`https://picsum.photos/100/100?random=${Date.now()}`);
    setContactRealName('');
    setContactRemark('');
    setContactSignature('');
    setContactPersona('');
    setContactCategory('waiting');
    setIsDetailedAddContactOpen(true);
  };

  const saveNewContact = async () => {
    if (!contactRemark.trim()) {
        alert("请输入备注或昵称");
        return;
    }
    setIsAddingContact(true);
    
    // No greeting message generation. Contact starts silently.

    const newChatId = Date.now().toString();
    const newChat: ChatMessage = {
      id: newChatId,
      avatar: contactAvatar,
      name: contactRemark,
      realName: contactRealName,
      signature: contactSignature,
      persona: contactPersona,
      time: '刚刚',
      message: '', // No message preview
      isVip: false,
      isGroup: contactCategory === 'group',
      categories: contactCategory === 'group' ? [] : [contactCategory]
    };

    setChatHistory(prev => ({
        ...prev,
        [newChatId]: []
    }));
    setChats([newChat, ...chats]);
    setIsAddingContact(false);
    setIsDetailedAddContactOpen(false);
  };

  const handleSendMessage = async (text: string) => {
    if (!activeChat) return;
    
    const now = new Date();
    const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMessage: Message = {
        id: Date.now().toString(),
        text,
        isMe: true,
        time: timeString
    };

    const updatedHistory = {
        ...chatHistory,
        [activeChat.id]: [...(chatHistory[activeChat.id] || []), newMessage]
    };
    setChatHistory(updatedHistory);
    
    // Update preview in list
    setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, message: text, time: newMessage.time } : c));

    // AI Reply Logic
    const chatAccount = accounts.find(a => a.id === activeChat.myAccountId) || currentAccount;
    if (activeChat.persona && process.env.API_KEY) {
        try {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
             // Retrieve recent history for context (last 10 messages)
             const recentHistory = (updatedHistory[activeChat.id] || []).slice(-10).map(m => `${m.isMe ? 'User' : 'Contact'}: ${m.text}`).join('\n');
             
             let timeContext = "";
             if (activeChat.timePerceptionEnabled) {
                 const aiTz = activeChat.aiTimezone || 'Asia/Shanghai';
                 const userTz = activeChat.userTimezone || 'Asia/Shanghai';
                 
                 const aiTime = new Date().toLocaleString('en-US', { timeZone: aiTz, hour: '2-digit', minute: '2-digit', hour12: false });
                 const userTime = new Date().toLocaleString('en-US', { timeZone: userTz, hour: '2-digit', minute: '2-digit', hour12: false });
                 
                 timeContext = `
                 [Time Perception Enabled]
                 Current time for YOU (AI): ${aiTime} (${aiTz})
                 Current time for USER: ${userTime} (${userTz})
                 Please reflect the time of day in your response if relevant (e.g., saying good morning/night, commenting on late hours).
                 `;
             }

             const prompt = `
             You are acting as a character in a chat.
             Your persona: "${activeChat.persona}".
             User's persona: "${chatAccount.persona}".
             ${timeContext}
             
             Chat History:
             ${recentHistory}
             
             Respond to the last message as your character. Keep it short (under 30 words), casual, and in character.
             `;
             
             const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
             const replyText = response.text?.trim();

             if (replyText) {
                 const nowReply = new Date();
                 const replyTime = `${nowReply.getHours()}:${nowReply.getMinutes().toString().padStart(2, '0')}`;
                 const replyMsg: Message = {
                     id: Date.now().toString() + '_reply',
                     text: replyText,
                     isMe: false,
                     time: replyTime
                 };
                 
                 setChatHistory(prev => ({
                     ...prev,
                     [activeChat.id]: [...(prev[activeChat.id] || []), replyMsg]
                 }));
                 setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, message: replyText, time: replyMsg.time } : c));
             }
        } catch (e) {
            console.error("AI reply failed", e);
        }
    }
  };

  const generateContactPersona = async () => {
    if (!contactRemark && !contactRealName) return;
    setIsGeneratingPersona(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const name = contactRemark || contactRealName;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `为名为"${name}"的联系人生成一个简短、可爱、有趣的人设描述，15字以内。不要包含"人设"二字。`,
        });
        setContactPersona(response.text?.trim() || '');
    } catch (error) {
        setContactPersona("神秘的有趣灵魂");
    } finally {
        setIsGeneratingPersona(false);
    }
  };

  const handleContactClick = (contact: ChatMessage) => {
      setViewingContact(contact);
      setEditingPersona(contact.persona || '');
      setEditingContactName(contact.name);
      setEditingContactRealName(contact.realName || '');
      setEditingContactSignature(contact.signature || '');
      setEditingContactAvatar(contact.avatar);
      setIsContactDetailOpen(true);
  };

  const saveContactEdit = () => {
      if (!viewingContact) return;
      if (!editingContactName.trim()) { alert("备注名不能为空"); return; }
      setChats(prev => prev.map(c => c.id === viewingContact.id ? { 
          ...c, 
          name: editingContactName,
          realName: editingContactRealName,
          signature: editingContactSignature,
          avatar: editingContactAvatar,
          persona: editingPersona 
      } : c));
      setIsContactDetailOpen(false);
  };

  const deleteCurrentContact = () => {
      if (!viewingContact) return;
      if (window.confirm(`确定要删除联系人 "${viewingContact.name}" 吗？`)) {
          setChats(prev => prev.filter(c => c.id !== viewingContact.id));
          // Also remove history to clean up
          const newHistory = { ...chatHistory };
          delete newHistory[viewingContact.id];
          setChatHistory(newHistory);
          setIsContactDetailOpen(false);
      }
  };

  const generatePersonaForEditing = async () => {
      if (!viewingContact) return;
      setIsGeneratingContactPersona(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `为名为"${viewingContact.name}"的联系人生成一个简短、可爱、有趣的人设描述，15字以内。`,
          });
          setEditingPersona(response.text?.trim() || '');
      } catch (error) {} finally {
          setIsGeneratingContactPersona(false);
      }
  };

  const openAddAccount = () => {
    setEditingAccount(null);
    setTempAccountName('');
    setTempAccountAvatar('https://picsum.photos/100/100?random=' + Date.now());
    setTempAccountPersona('');
    setTempAccountSignature('新人驾到');
    setIsEditAccountModalOpen(true);
  };

  const openEditAccount = (account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAccount(account);
    setTempAccountName(account.name);
    setTempAccountAvatar(account.avatar);
    setTempAccountPersona(account.persona);
    setTempAccountSignature(account.signature);
    setIsEditAccountModalOpen(true);
  };

  const handleSaveAccount = () => {
    if (!tempAccountName.trim()) return;
    if (editingAccount) {
      setAccounts(prev => prev.map(acc => acc.id === editingAccount.id ? {
        ...acc,
        name: tempAccountName,
        avatar: tempAccountAvatar,
        persona: tempAccountPersona,
        signature: tempAccountSignature
      } : acc));
    } else {
      const newAcc: Account = {
        id: Date.now().toString(),
        name: tempAccountName,
        avatar: tempAccountAvatar,
        persona: tempAccountPersona || '普通用户',
        signature: tempAccountSignature || '新人驾到'
      };
      setAccounts(prev => [...prev, newAcc]);
    }
    setIsEditAccountModalOpen(false);
  };

  const handleDeleteAccount = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (accounts.length <= 1) { alert("至少保留一个账号"); return; }
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (currentAccountId === id) setCurrentAccountId(accounts.find(a => a.id !== id)?.id || '');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (avatarPickerTarget === 'account') setTempAccountAvatar(result);
        else if (avatarPickerTarget === 'contact') setContactAvatar(result);
        else if (avatarPickerTarget === 'contact_edit') setEditingContactAvatar(result);
        else if (avatarPickerTarget === 'chat_bg' && activeChat) {
            setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, background: result } : c));
        }
        setIsAvatarPickerOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleUrlInputConfirm = () => {
      if (avatarUrlInput.trim()) {
          const url = avatarUrlInput.trim();
          if (avatarPickerTarget === 'account') setTempAccountAvatar(url);
          else if (avatarPickerTarget === 'contact') setContactAvatar(url);
          else if (avatarPickerTarget === 'contact_edit') setEditingContactAvatar(url);
          else if (avatarPickerTarget === 'chat_bg' && activeChat) {
              setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, background: url } : c));
          }
          setAvatarUrlInput('');
          setIsUrlInputMode(false);
          setIsAvatarPickerOpen(false);
      }
  };

  const generatePersona = async () => {
    if (!tempAccountName) return;
    setIsGeneratingPersona(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `为名为"${tempAccountName}"的社交账号生成一个简短、可爱、有趣的人设描述，15字以内。`,
        });
        setTempAccountPersona(response.text?.trim() || '');
    } catch (error) {
        setTempAccountPersona("可爱的萌新驾到~");
    } finally {
        setIsGeneratingPersona(false);
    }
  };

  const handleTouchStart = (chat: ChatMessage) => {
      isLongPress.current = false;
      // @ts-ignore
      pressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          setLongPressChat(chat);
          setIsLongPressMenuOpen(true);
      }, 600);
  };

  const handleTouchEnd = () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
  };
  
  const handleChatClick = (chat: ChatMessage) => {
      if (isLongPress.current) return;
      setActiveChat(chat);
  }
  
  const handleTogglePin = () => {
      if (longPressChat) {
          setChats(prev => prev.map(c => c.id === longPressChat.id ? { ...c, isPinned: !c.isPinned } : c));
          setIsLongPressMenuOpen(false);
          setLongPressChat(null);
      }
  }

  const MeMenuItem = ({ icon, text, border = true, onClick }: { icon: React.ReactNode, text: string, border?: boolean, onClick?: () => void }) => (
    <div className="flex items-center pl-4 pr-4 py-3.5 active:bg-gray-50 transition-colors cursor-pointer bg-white relative" onClick={onClick}>
      <div className="text-gray-400 mr-3">{icon}</div>
      <div className={`flex-1 flex items-center justify-between py-1 ${border ? 'border-b border-gray-100' : ''}`}>
          <span className="text-[15px] text-gray-800 tracking-wide">{text}</span>
          <ChevronRight size={16} className="text-gray-300" />
      </div>
    </div>
  );

  return (
    <div className="flex justify-center min-h-screen bg-[#f2f4f7]">
      <div className="w-full max-w-md bg-[#f8f9fb] h-screen relative flex flex-col shadow-2xl overflow-hidden">
        
        <StatusBar className="w-full z-50 pt-2" />
        
        {activeChat ? (
            <ChatInterface 
              chat={activeChat} 
              account={accounts.find(a => a.id === activeChat.myAccountId) || currentAccount} 
              onBack={() => setActiveChat(null)} 
              messages={chatHistory[activeChat.id] || []}
              onSend={handleSendMessage}
              onDeleteChat={() => {
                  setChats(prev => prev.filter(c => c.id !== activeChat.id));
                  const newHistory = { ...chatHistory };
                  delete newHistory[activeChat.id];
                  setChatHistory(newHistory);
                  setActiveChat(null);
              }}
              onClearHistory={() => {
                  setChatHistory(prev => ({ ...prev, [activeChat.id]: [] }));
                  setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, message: '', time: '' } : c));
              }}
              onTogglePin={() => {
                  setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, isPinned: !c.isPinned } : c));
              }}
              onUpdateChat={(updates) => {
                  setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, ...updates } : c));
                  // Always update activeChat reference immediately for UI consistency
                  setActiveChat(prev => prev ? { ...prev, ...updates } : null);
              }}
              accounts={accounts}
              onSwitchAccount={(id) => {
                  setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, myAccountId: id } : c));
                  setActiveChat(prev => prev ? { ...prev, myAccountId: id } : null);
              }}
              onOpenBackgroundPicker={() => {
                  setAvatarPickerTarget('chat_bg');
                  setIsAvatarPickerOpen(true);
                  setIsUrlInputMode(false);
              }}
            />
        ) : (
        <>
        {activeBottomTab === 'me' ? (
           <div className="flex-1 overflow-y-auto no-scrollbar relative bg-[#f2f4f7]">
              <div className="pt-14 pb-8 px-6 flex items-start">
                 <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden border border-gray-100 shadow-sm shrink-0">
                     <img src={currentAccount.avatar} alt="avatar" className="w-full h-full object-cover" />
                 </div>
                 <div className="ml-5 flex-1 pt-1">
                     <div className="text-xl font-bold text-gray-900 mb-2">{currentAccount.name}</div>
                     <div className="flex items-center space-x-3">
                         <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-200 bg-white/50 backdrop-blur-sm cursor-pointer active:scale-95 transition-transform" onClick={(e) => { e.stopPropagation(); setTempSubStatusText(subStatusText); setIsSubStatusModalOpen(true); }}>
                             <div className="w-2 h-2 rounded-full bg-gray-400 mr-1.5"></div>
                             <span className="text-xs text-gray-500 font-medium">状态</span>
                         </div>
                         <button className="p-1.5 rounded-full border border-gray-200 bg-white/50 text-gray-400 hover:bg-white transition-colors" onClick={(e) => { e.stopPropagation(); setTempSubStatusText(subStatusText); setIsSubStatusModalOpen(true); }}>
                             <Edit2 size={12} />
                         </button>
                     </div>
                 </div>
              </div>

              <div className="mx-4 mb-3 rounded-2xl overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                 <MeMenuItem icon={<ShoppingBag size={20} className="fill-gray-400" />} text="支付与服务" border={false} />
              </div>

              <div className="mx-4 mb-3 rounded-2xl overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                 <MeMenuItem icon={<Users size={20} className="fill-gray-400" />} text="账号管理" onClick={() => setIsAccountManagerOpen(true)} />
                 <MeMenuItem icon={<ImageIcon size={20} className="fill-gray-400" />} text="日记" />
                 <MeMenuItem icon={<Smile size={20} className="fill-gray-400" />} text="表情" border={false} />
              </div>

              <div className="mx-4 mb-24 rounded-2xl overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                 <MeMenuItem icon={<SettingsIcon size={20} className="fill-gray-400" />} text="美化" border={false} />
              </div>
           </div>
        ) : activeBottomTab === 'contacts' ? (
           <div className="flex-1 overflow-y-auto no-scrollbar relative bg-[#f2f4f7] pb-24">
               <div className="px-5 pt-4 pb-2 bg-[#f8f9fb] z-10">
                   <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                        <input type="text" className="block w-full pl-10 pr-3 py-2 border-none rounded-full leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 shadow-sm text-sm" placeholder="搜索" />
                   </div>
               </div>
               
               <div className="mt-4 pb-10">
                   {tabs.filter(t => t.id !== 'all').map(tab => {
                       const tabContacts = chats.filter(c => c.categories?.includes(tab.id) && !c.isGroup);
                       if (tab.id === 'group') return null;

                       return (
                           <div key={tab.id} className="mb-8">
                               <div className="px-4 space-y-3">
                                   {tabContacts.length > 0 ? (
                                       tabContacts.map((contact, index) => (
                                           <div key={contact.id} onClick={() => handleContactClick(contact)} className="relative bg-white rounded-[40px] p-4 flex items-center shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
                                               {/* Online Badge */}
                                               {index === 0 && (
                                                   <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#e8e8ea] px-4 py-0.5 rounded-full flex items-center gap-1.5 border-[3px] border-[#f2f4f7]">
                                                       <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                                       <span className="text-[11px] text-gray-500 font-serif tracking-widest">{tab.label}</span>
                                                   </div>
                                               )}
                                               
                                               <img src={contact.avatar} className="w-12 h-12 rounded-full object-cover mr-4 grayscale" />
                                               <div className="flex-1 min-w-0">
                                                   <div className="flex justify-between items-center mb-1">
                                                       <div className="text-[16px] font-medium text-gray-900">{contact.name}</div>
                                                       <div className="text-xs text-gray-400">{contact.time || ''}</div>
                                                   </div>
                                                   <div className="text-[13px] text-gray-400 truncate">{contact.message || contact.signature || '暂无签名'}</div>
                                               </div>
                                           </div>
                                       ))
                                   ) : (
                                       <div className="py-2 text-center text-xs text-gray-300">暂无联系人</div>
                                   )}
                               </div>
                           </div>
                       )
                   })}
               </div>
           </div>
        ) : (
           <>
            <div className="px-5 pt-2 pb-4 flex flex-col space-y-4 bg-[#f8f9fb] relative z-10">
              
              <div className="flex justify-between items-center relative">
                <div className="flex items-center space-x-3">
                  <div className="relative cursor-pointer active:scale-95 transition-transform" onClick={() => window.history.back()}>
                    <img src={currentAccount.avatar} alt="User" className="w-10 h-10 rounded-full border border-gray-100 shadow-sm object-cover" />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[2px]">
                      <div className="w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-white"></div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-gray-800 leading-tight">{currentAccount.name}</span>
                    <div className="flex items-center space-x-1 cursor-pointer active:opacity-60 transition-opacity" onClick={() => { setTempSubStatusText(subStatusText); setIsSubStatusModalOpen(true); }}>
                      <div className="w-3 h-3 rounded-full bg-gray-200 flex items-center justify-center"><div className="w-1 h-1 bg-gray-400 rounded-full"></div></div>
                      <span className="text-[10px] text-gray-400">{subStatusText}</span>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 active:scale-95 transition-all" onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}>
                      <Plus size={20} />
                    </div>
                    {isPlusMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsPlusMenuOpen(false)}></div>
                            <div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <button onClick={openAddContactModal} className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                    <UserPlus size={18} className="text-gray-500" /> 添加联系人
                                </button>
                                <button onClick={() => { alert("组建群聊功能开发中"); setIsPlusMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors border-t border-gray-50">
                                    <MessageSquarePlus size={18} className="text-gray-500" /> 组建群聊
                                </button>
                            </div>
                        </>
                    )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                <input type="text" className="block w-full pl-10 pr-3 py-2.5 border-none rounded-full leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 shadow-sm text-sm" placeholder="wink" />
              </div>

              <div className="flex items-end pt-1 px-1 overflow-x-auto no-scrollbar space-x-8 pr-4">
                {tabs.map((tab) => (
                  <div key={tab.id} className="flex flex-col items-center cursor-pointer group flex-shrink-0" onClick={() => setActiveTabId(tab.id)}>
                    <span className={`text-[15px] whitespace-nowrap transition-colors ${activeTabId === tab.id ? 'font-bold text-gray-800' : 'text-gray-400 font-medium'}`}>{tab.label}</span>
                    {activeTabId === tab.id && <div className="mt-1.5 w-6 h-[3px] bg-gray-300 rounded-full"></div>}
                  </div>
                ))}
                <div className="flex flex-col items-center cursor-pointer flex-shrink-0 pb-1" onClick={openTabManager}>
                  <Plus className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                </div>
              </div>

            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative">
              <div className="mx-5 mb-4">
                <div className="bg-white rounded-2xl p-2.5 px-4 flex items-center space-x-3 shadow-sm w-full">
                  <div className="w-9 h-9 bg-gray-400 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-inner">{badgeText}</div>
                  <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input ref={inputRef} type="text" value={statusText} onChange={(e) => setStatusText(e.target.value)} onBlur={() => setIsEditing(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)} className="w-full text-sm text-gray-600 font-medium bg-transparent outline-none" />
                      ) : (
                        <span className="block text-sm text-gray-600 font-medium truncate cursor-pointer" onClick={() => setIsEditing(true)}>{statusText}</span>
                      )}
                  </div>
                </div>
              </div>

              <div className="bg-white mx-0 rounded-t-[35px] min-h-full pb-24 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                <div className="pt-6 px-4 flex flex-col space-y-1">
                  {filteredChats.length > 0 ? (
                    filteredChats.map((chat) => (
                      <div 
                        key={chat.id} 
                        onClick={() => handleChatClick(chat)} 
                        onTouchStart={() => handleTouchStart(chat)}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={() => handleTouchStart(chat)}
                        onMouseUp={handleTouchEnd}
                        onMouseLeave={handleTouchEnd}
                        className={`flex items-start space-x-4 p-3.5 active:bg-gray-100 rounded-2xl transition-colors cursor-pointer select-none ${chat.isPinned ? 'bg-gray-50' : ''}`}
                      >
                        <div className="relative flex-shrink-0">
                          <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover border-[0.5px] border-gray-100" />
                          {chat.isVip && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-[8px] font-bold">V</div>}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex justify-between items-baseline mb-1">
                            <h3 className="text-[15px] font-bold text-gray-900 truncate pr-2">{chat.name}</h3>
                            <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">{chat.time}</span>
                          </div>
                          <p className="text-[13px] text-gray-500 truncate leading-relaxed">{chat.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><MessageCircle className="text-gray-300 w-8 h-8" /></div>
                      <p className="text-gray-400 text-sm font-medium">暂无消息</p>
                      <p className="text-gray-300 text-xs mt-1">点击右上角 + 添加联系人</p>
                    </div>
                  )}
                  <div className="h-10"></div>
                </div>
              </div>
            </div>
           </>
        )}

        {!activeChat && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md pt-2 pb-6 px-8 flex justify-between items-center rounded-t-[30px] shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.03)] z-50">
          <button className="flex flex-col items-center space-y-1 group w-12" onClick={() => setActiveBottomTab('weixin')}>
            <div className="relative">
               <MessageCircle className={`w-6 h-6 transition-colors ${activeBottomTab === 'weixin' ? 'text-[#B5B5BC] fill-[#B5B5BC]' : 'text-gray-400'}`} strokeWidth={activeBottomTab === 'weixin' ? 0 : 2} />
               {activeBottomTab === 'weixin' && <div className="absolute -top-0 right-[-4px] w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></div>}
            </div>
            <span className={`text-[10px] font-medium transition-colors ${activeBottomTab === 'weixin' ? 'text-[#B5B5BC]' : 'text-gray-400'}`}>QQ</span>
          </button>
          <button className="flex flex-col items-center space-y-1 group w-12" onClick={() => setActiveBottomTab('contacts')}>
            <div className="relative">
               <Contact className={`w-6 h-6 transition-colors ${activeBottomTab === 'contacts' ? 'text-[#B5B5BC] fill-[#B5B5BC]' : 'text-gray-400'}`} strokeWidth={activeBottomTab === 'contacts' ? 0 : 2} />
               {activeBottomTab === 'contacts' && <div className="absolute -top-0 right-[-4px] w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></div>}
            </div>
            <span className={`text-[10px] font-medium transition-colors ${activeBottomTab === 'contacts' ? 'text-[#B5B5BC]' : 'text-gray-400'}`}>通讯录</span>
          </button>
          <button className="flex flex-col items-center space-y-1 group w-12" onClick={() => setActiveBottomTab('discover')}>
             <div className="relative">
               <Star className={`w-6 h-6 transition-colors ${activeBottomTab === 'discover' ? 'text-[#B5B5BC] fill-[#B5B5BC]' : 'text-gray-400'}`} strokeWidth={activeBottomTab === 'discover' ? 0 : 2} />
               {activeBottomTab === 'discover' && <div className="absolute -top-0 right-[-4px] w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></div>}
            </div>
            <span className={`text-[10px] font-medium transition-colors ${activeBottomTab === 'discover' ? 'text-[#B5B5BC]' : 'text-gray-400'}`}>朋友圈</span>
          </button>
          <button className="flex flex-col items-center space-y-1 group w-12" onClick={() => setActiveBottomTab('me')}>
             <div className="relative">
               <User className={`w-6 h-6 transition-colors ${activeBottomTab === 'me' ? 'text-[#B5B5BC] fill-[#B5B5BC]' : 'text-gray-400'}`} strokeWidth={activeBottomTab === 'me' ? 0 : 2} />
               {activeBottomTab === 'me' && <div className="absolute -top-0 right-[-4px] w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></div>}
            </div>
            <span className={`text-[10px] font-medium transition-colors ${activeBottomTab === 'me' ? 'text-[#B5B5BC]' : 'text-gray-400'}`}>我</span>
          </button>
        </div>
        )}
        </>
        )}

        {isSubStatusModalOpen && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm px-8">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-base font-bold text-gray-800 mb-4 text-center">修改在线状态</h3>
              <input type="text" value={tempSubStatusText} onChange={(e) => setTempSubStatusText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveSubStatus()} className="w-full bg-[#f2f4f7] rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-gray-300 transition-all placeholder-gray-400 mb-6" placeholder="请输入状态..." autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setIsSubStatusModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 text-sm font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">取消</button>
                <button onClick={saveSubStatus} className="flex-1 bg-black text-white text-sm font-bold py-3 rounded-xl hover:bg-gray-800 shadow-lg shadow-black/20 transition-all">保存</button>
              </div>
            </div>
          </div>
        )}

        {isTabManagerOpen && (
          <div className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-t-[30px] sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">分组管理</h3>
                <button onClick={() => setIsTabManagerOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={18} className="text-gray-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 mb-6">
                {editingTabs.map((tab) => (
                  <div key={tab.id} className="flex items-center space-x-3 bg-[#f8f9fb] p-3 rounded-xl border border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs shrink-0">{tab.label.charAt(0)}</div>
                    <input type="text" value={tab.label} onChange={(e) => updateTabName(tab.id, e.target.value)} className="flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none" />
                    <Edit2 size={14} className="text-gray-300" />
                  </div>
                ))}
                <button onClick={addNewTab} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium flex items-center justify-center gap-2 hover:border-gray-400 hover:text-gray-800 transition-colors"><Plus size={16} /> 添加新分组</button>
              </div>
              <button onClick={saveTabChanges} className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 shadow-lg shadow-black/20 transition-all">保存修改</button>
            </div>
          </div>
        )}

        {isDetailedAddContactOpen && (
          <div className="absolute inset-0 z-[75] flex items-center justify-center bg-black/40 backdrop-blur-sm px-6 animate-in fade-in duration-200">
             <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-lg font-bold text-gray-900">添加联系人</h3>
                    <button onClick={() => setIsDetailedAddContactOpen(false)} className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"><X size={18} /></button>
                </div>
                <div className="flex flex-col items-center mb-6 shrink-0">
                    <div className="relative w-20 h-20 rounded-full group cursor-pointer" onClick={() => { setAvatarPickerTarget('contact'); setIsAvatarPickerOpen(true); setIsUrlInputMode(false); }}>
                       <img src={contactAvatar} className="w-full h-full rounded-full object-cover border-2 border-gray-100 group-hover:opacity-80 transition-opacity" />
                       <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={20} className="text-white" /></div>
                       <div className="absolute bottom-0 right-0 bg-black text-white p-1 rounded-full border-2 border-white"><Plus size={10} strokeWidth={3} /></div>
                    </div>
                    <span className="text-xs text-gray-400 mt-2">点击设置头像</span>
                </div>
                <div className="space-y-4 flex-1">
                   <div>
                      <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">备注/昵称 (必填)</label>
                      <input type="text" value={contactRemark} onChange={(e) => setContactRemark(e.target.value)} placeholder="在列表中显示的名字" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10 transition-all border border-gray-100" />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">真实姓名</label>
                       <input type="text" value={contactRealName} onChange={(e) => setContactRealName(e.target.value)} placeholder="选填" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10 transition-all border border-gray-100" />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">个性签名</label>
                       <input type="text" value={contactSignature} onChange={(e) => setContactSignature(e.target.value)} placeholder="展示在列表中的签名" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10 transition-all border border-gray-100" />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-gray-500 ml-1 mb-2 block">选择分组</label>
                       <div className="flex flex-wrap gap-2">
                            {tabs.filter(t => t.id !== 'all').map((tab) => (
                            <button key={tab.id} onClick={() => setContactCategory(tab.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${contactCategory === tab.id ? 'bg-[#efe4e9] text-gray-800 border-[#efe4e9] shadow-md shadow-[#efe4e9]/50' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{tab.label}{contactCategory === tab.id && <Check size={10} strokeWidth={3} />}</button>
                            ))}
                        </div>
                   </div>
                   <div>
                      <div className="flex justify-between items-center mb-1 ml-1">
                          <label className="text-xs font-bold text-gray-500">人设 (仅用于AI对话)</label>
                      </div>
                      <textarea value={contactPersona} onChange={(e) => setContactPersona(e.target.value)} placeholder="例如：高冷学霸、软萌妹子..." rows={3} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10 transition-all border border-gray-100 resize-none" />
                   </div>
                </div>
                <div className="mt-8 flex gap-3 shrink-0">
                   <button onClick={() => setIsDetailedAddContactOpen(false)} className="flex-1 bg-gray-100 text-gray-900 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors text-sm">取消</button>
                   <button onClick={saveNewContact} disabled={!contactRemark || isAddingContact} className="flex-1 bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 shadow-lg shadow-black/20 transition-all disabled:opacity-50 text-sm flex justify-center items-center">{isAddingContact ? <RefreshCw className="animate-spin w-4 h-4" /> : "添加"}</button>
                </div>
             </div>
          </div>
        )}

        {isAccountManagerOpen && (
          <div className="absolute inset-0 z-[60] bg-[#f2f4f7] flex flex-col animate-in slide-in-from-right duration-300">
             <div className="bg-white px-5 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
                <button onClick={() => setIsAccountManagerOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronLeft size={24} className="text-gray-800" /></button>
                <span className="font-bold text-lg text-gray-900">账号管理</span>
                <button onClick={openAddAccount} className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"><Plus size={24} className="text-gray-800" /></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {accounts.map(acc => (
                   <div key={acc.id} onClick={() => setCurrentAccountId(acc.id)} className={`bg-white p-4 rounded-2xl flex items-center space-x-4 shadow-sm border transition-all cursor-pointer ${currentAccountId === acc.id ? 'border-[#efe4e9] ring-1 ring-[#efe4e9]' : 'border-transparent hover:border-gray-200'}`}>
                      <div className="relative shrink-0">
                         <img src={acc.avatar} className="w-14 h-14 rounded-full object-cover border border-gray-100" />
                         {currentAccountId === acc.id && <div className="absolute -bottom-1 -right-1 bg-[#efe4e9] rounded-full p-1 border-2 border-white"><Check size={10} className="text-gray-800" strokeWidth={3} /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start"><h3 className="font-bold text-gray-900 truncate pr-2">{acc.name}</h3></div>
                         <p className="text-xs text-gray-500 truncate mt-0.5"><span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 mr-1.5 font-medium">签名</span>{acc.signature}</p>
                      </div>
                      <div className="flex items-center space-x-1 pl-2">
                         <button onClick={(e) => openEditAccount(acc, e)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-[#efe4e9] rounded-full transition-colors"><Edit2 size={16} /></button>
                         {accounts.length > 1 && <button onClick={(e) => handleDeleteAccount(acc.id, e)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={16} /></button>}
                      </div>
                   </div>
                 ))}
                 <div className="text-center text-xs text-gray-400 mt-6 pb-8">点击账号可切换当前身份</div>
             </div>
          </div>
        )}

        {isEditAccountModalOpen && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm px-6 animate-in fade-in duration-200">
             <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-lg font-bold text-gray-900">{editingAccount ? '编辑账号' : '添加账号'}</h3>
                    <button onClick={() => setIsEditAccountModalOpen(false)} className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"><X size={18} /></button>
                </div>
                <div className="flex flex-col items-center mb-6 shrink-0">
                    <div className="relative w-20 h-20 rounded-full group cursor-pointer" onClick={() => { setAvatarPickerTarget('account'); setIsAvatarPickerOpen(true); setIsUrlInputMode(false); }}>
                       <img src={tempAccountAvatar} className="w-full h-full rounded-full object-cover border-2 border-gray-100 group-hover:opacity-80 transition-opacity" />
                       <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={20} className="text-white" /></div>
                       <div className="absolute bottom-0 right-0 bg-black text-white p-1 rounded-full border-2 border-white"><Plus size={10} strokeWidth={3} /></div>
                    </div>
                    <span className="text-xs text-gray-400 mt-2">点击修改头像</span>
                </div>
                <div className="space-y-4 flex-1">
                   <div>
                      <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">昵称</label>
                      <input type="text" value={tempAccountName} onChange={(e) => setTempAccountName(e.target.value)} placeholder="给你的账号起个名字" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10 transition-all border border-gray-100" />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">个性签名</label>
                       <input type="text" value={tempAccountSignature} onChange={(e) => setTempAccountSignature(e.target.value)} placeholder="展示在资料页的签名" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10 transition-all border border-gray-100" />
                   </div>
                   <div>
                      <div className="flex justify-between items-center mb-1 ml-1">
                          <label className="text-xs font-bold text-gray-500">人设 (仅用于AI对话)</label>
                      </div>
                      <textarea value={tempAccountPersona} onChange={(e) => setTempAccountPersona(e.target.value)} placeholder="例如：高冷学霸、软萌妹子..." rows={3} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10 transition-all border border-gray-100 resize-none" />
                   </div>
                </div>
                <div className="mt-8 flex gap-3 shrink-0">
                   <button onClick={() => setIsEditAccountModalOpen(false)} className="flex-1 bg-gray-100 text-gray-900 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors text-sm">取消</button>
                   <button onClick={handleSaveAccount} disabled={!tempAccountName} className="flex-1 bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 shadow-lg shadow-black/20 transition-all disabled:opacity-50 text-sm">保存</button>
                </div>
             </div>
          </div>
        )}

        {isAvatarPickerOpen && (
           <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm px-8 animate-in fade-in duration-200">
               <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-gray-100 text-center font-bold text-gray-900">选择头像方式</div>
                  {isUrlInputMode ? (
                      <div className="p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-200">
                           <div className="flex items-center gap-2 mb-1">
                                <button onClick={() => setIsUrlInputMode(false)} className="text-gray-400 hover:text-gray-600"><ChevronLeft size={20} /></button>
                                <span className="text-sm font-bold text-gray-700">输入图片链接</span>
                           </div>
                           <input type="text" value={avatarUrlInput} onChange={(e) => setAvatarUrlInput(e.target.value)} placeholder="https://..." autoFocus className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 border border-gray-200" />
                           <button onClick={handleUrlInputConfirm} disabled={!avatarUrlInput.trim()} className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 disabled:opacity-50 transition-all mt-2">确定</button>
                      </div>
                  ) : (
                      <div className="flex flex-col p-2">
                         <button className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-xl transition-colors text-left" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><Upload size={20} className="text-gray-600" /></div>
                            <div><div className="text-sm font-bold text-gray-900">上传本地图片</div><div className="text-xs text-gray-500">从设备相册选择</div></div>
                         </button>
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                         <button className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-xl transition-colors text-left" onClick={() => { setAvatarUrlInput(''); setIsUrlInputMode(true); }}>
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><Link size={20} className="text-gray-600" /></div>
                            <div><div className="text-sm font-bold text-gray-900">网络图片链接</div><div className="text-xs text-gray-500">输入图片 URL 地址</div></div>
                         </button>
                      </div>
                  )}
                  {!isUrlInputMode && <div className="p-2 border-t border-gray-100"><button onClick={() => setIsAvatarPickerOpen(false)} className="w-full py-3 text-center font-bold text-gray-900 hover:bg-gray-50 rounded-xl transition-colors text-sm">取消</button></div>}
               </div>
           </div>
        )}

        {isContactDetailOpen && viewingContact && (
           <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm px-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col relative overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar">
                  <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-blue-50 to-white"></div>
                  <button onClick={() => setIsContactDetailOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/50 text-gray-500 hover:bg-gray-100 z-10"><X size={20} /></button>
                  <div className="flex flex-col items-center relative z-10 mt-4">
                      <div className="w-24 h-24 rounded-full p-1 bg-white shadow-md cursor-pointer group relative" onClick={() => { setAvatarPickerTarget('contact_edit'); setIsAvatarPickerOpen(true); setIsUrlInputMode(false); }}>
                          <img src={editingContactAvatar} className="w-full h-full rounded-full object-cover group-hover:opacity-80 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={24} className="text-white" /></div>
                      </div>
                      <div className="w-full mt-4 space-y-3">
                          <div className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 flex flex-col"><label className="text-[10px] text-gray-400 font-bold uppercase">备注名 (必填)</label><input type="text" value={editingContactName} onChange={(e) => setEditingContactName(e.target.value)} className="bg-transparent text-lg font-bold text-gray-900 outline-none text-center" placeholder="备注" /></div>
                          <div className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 flex flex-col"><label className="text-[10px] text-gray-400 font-bold uppercase">真实姓名</label><input type="text" value={editingContactRealName} onChange={(e) => setEditingContactRealName(e.target.value)} className="bg-transparent text-sm text-gray-600 outline-none text-center" placeholder="未设置" /></div>
                          <div className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 flex flex-col"><label className="text-[10px] text-gray-400 font-bold uppercase">个性签名</label><input type="text" value={editingContactSignature} onChange={(e) => setEditingContactSignature(e.target.value)} className="bg-transparent text-sm text-gray-600 outline-none text-center" placeholder="暂无个性签名" /></div>
                      </div>
                  </div>
                  <div className="mt-6 space-y-4 relative z-10">
                      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">设定人设 (AI Persona)</label>
                              <button onClick={generatePersonaForEditing} disabled={isGeneratingContactPersona} className="text-[10px] font-bold text-blue-500 flex items-center gap-1 hover:text-blue-600"><RefreshCw size={10} className={isGeneratingContactPersona ? "animate-spin" : ""} /> AI 生成</button>
                          </div>
                          <textarea value={editingPersona} onChange={(e) => setEditingPersona(e.target.value)} className="w-full bg-transparent text-sm text-gray-800 outline-none resize-none placeholder-gray-300 min-h-[60px]" placeholder="为该联系人设定一个性格描述，用于AI对话..." />
                      </div>
                  </div>
                  <div className="mt-8 flex gap-3 z-10">
                      <button onClick={deleteCurrentContact} className="flex-1 bg-red-50 text-red-500 font-bold py-3.5 rounded-xl hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-2"><Trash2 size={16} /> 删除</button>
                      <button onClick={saveContactEdit} className="flex-[2] bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 shadow-lg shadow-black/20 transition-all text-sm">保存修改</button>
                  </div>
              </div>
           </div>
        )}
        
        {isLongPressMenuOpen && longPressChat && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsLongPressMenuOpen(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-64 overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                        <img src={longPressChat.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 truncate">{longPressChat.name}</h3>
                            <p className="text-xs text-gray-500 truncate">{longPressChat.signature || '暂无签名'}</p>
                        </div>
                    </div>
                    <div className="p-2">
                        <button onClick={handleTogglePin} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left group">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                {longPressChat.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                            </div>
                            <span className="text-sm font-bold text-gray-700">{longPressChat.isPinned ? '取消置顶' : '置顶该聊天'}</span>
                        </button>
                         <button onClick={() => setIsLongPressMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left group">
                             <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                                <X size={16} />
                            </div>
                            <span className="text-sm font-bold text-gray-700">取消</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Profile Page Modal */}
        {isProfilePageOpen && (
            <div className="absolute inset-0 z-[80] bg-[#f2f4f7] flex flex-col animate-in slide-in-from-right duration-300">
                <div className="h-[105px] bg-white/90 backdrop-blur-md flex items-end justify-between px-4 pb-3 shadow-sm z-50 shrink-0">
                    <button onClick={() => setIsProfilePageOpen(false)} className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform">
                        <ChevronLeft className="text-gray-800 w-6 h-6" />
                    </button>
                    <span className="text-[17px] font-bold text-gray-900 pb-2">个人资料</span>
                    <div className="w-10"></div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    <div className="bg-white px-6 py-10 flex flex-col items-center shadow-sm">
                        <div className="relative w-28 h-28 mb-5">
                            <img src={currentAccount.avatar} className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg" />
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl font-bold text-gray-900">{currentAccount.name}</span>
                        </div>
                        
                        <p className="text-sm text-gray-500 text-center max-w-[80%] leading-relaxed">{currentAccount.signature || '暂无个性签名'}</p>
                        
                        <button 
                            onClick={(e) => openEditAccount(currentAccount, e)}
                            className="mt-6 px-8 py-2.5 bg-black text-white text-sm font-bold rounded-full hover:bg-gray-800 transition-colors shadow-md shadow-black/10"
                        >
                            编辑资料
                        </button>
                    </div>

                    <div className="mt-3 bg-white shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                            <span className="text-[15px] text-gray-900">QQ号</span>
                            <span className="text-[15px] text-gray-500 font-mono">{currentAccount.id.padStart(8, '0')}</span>
                        </div>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                            <span className="text-[15px] text-gray-900">昵称</span>
                            <span className="text-[15px] text-gray-500">{currentAccount.name}</span>
                        </div>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                            <span className="text-[15px] text-gray-900">个性签名</span>
                            <span className="text-[15px] text-gray-500 truncate max-w-[200px]">{currentAccount.signature || '未设置'}</span>
                        </div>
                        <div className="flex items-center justify-between px-6 py-4 cursor-pointer active:bg-gray-50 transition-colors" onClick={() => { setTempSubStatusText(subStatusText); setIsSubStatusModalOpen(true); }}>
                            <span className="text-[15px] text-gray-900">在线状态</span>
                            <div className="flex items-center gap-2 text-gray-500">
                                <span className="text-[15px]">{subStatusText}</span>
                                <ChevronRight size={16} className="text-gray-300" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);