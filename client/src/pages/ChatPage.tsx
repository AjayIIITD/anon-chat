import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Users, 
  LogOut, 
  Sparkles, 
  WifiOff, 
  AlertCircle,
  Clock,
  CheckCheck,
  Radio,
  Activity,
  Flame,
  UserCheck,
  Reply,
  X,
  SmilePlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { Message, Room, RoomMember, MessageReaction } from '../types';

interface ChatPageProps {
  roomId: string;
  onNavigate: (tab: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export const ChatPage: React.FC<ChatPageProps> = ({ roomId, onNavigate }) => {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time presence & typing state
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [showLiveBar, setShowLiveBar] = useState<boolean>(true);
  
  // Members drawer
  const [showMembersDrawer, setShowMembersDrawer] = useState<boolean>(false);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);

  // Reply state
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Reaction picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch initial room & messages
  const loadRoomData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [roomRes, msgRes] = await Promise.all([
        api.getRoom(roomId),
        api.getRoomMessages(roomId),
      ]);

      setRoom(roomRes.room);
      setMessages(msgRes.messages);

      // Auto-join room if not already a member
      if (!roomRes.room.is_member) {
        await api.joinRoom(roomId);
        setRoom({ ...roomRes.room, is_member: true });
      }
    } catch (err: any) {
      console.error('Error loading room:', err);
      setError(err.message || 'Failed to load conversation history.');
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom('auto'), 100);
    }
  };

  // Fetch room members
  const loadMembers = async () => {
    try {
      const res = await api.getRoomMembers(roomId);
      setRoomMembers(res.members);
    } catch (err) {
      console.error('Error loading room members:', err);
    }
  };

  useEffect(() => {
    loadRoomData();
    loadMembers();

    // Socket.IO Real-Time listeners
    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('join_room', roomId);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleNewMessage = (newMsg: Message) => {
      if (newMsg.room_id === roomId) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev;
          }
          return [...prev, newMsg];
        });
        setTimeout(() => scrollToBottom('smooth'), 50);
      }
    };

    const handlePresence = (data: { roomId: string; onlineCount: number; activeUsers: string[] }) => {
      if (data.roomId === roomId) {
        setOnlineCount(data.onlineCount);
        setActiveUsers(data.activeUsers);
      }
    };

    const handleUserTyping = (data: { roomId: string; username: string; isTyping: boolean }) => {
      if (data.roomId === roomId) {
        if (data.isTyping) {
          setTypingUser(data.username);
        } else {
          setTypingUser(null);
        }
      }
    };

    const handleReactionUpdate = (data: { roomId: string; messageId: string; reactions: MessageReaction[] }) => {
      if (data.roomId === roomId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, reactions: data.reactions }
              : msg
          )
        );
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('new_message', handleNewMessage);
    socket.on('room_presence', handlePresence);
    socket.on('user_typing', handleUserTyping);
    socket.on('reaction_update', handleReactionUpdate);

    if (socket.connected) {
      socket.emit('join_room', roomId);
    }

    return () => {
      socket.emit('leave_room', roomId);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('room_presence', handlePresence);
      socket.off('user_typing', handleUserTyping);
      socket.off('reaction_update', handleReactionUpdate);
    };
  }, [roomId]);

  // Handle typing indicator emission
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    const socket = getSocket();

    socket.emit('typing', { roomId, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false });
    }, 1500);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const text = inputMessage.trim();
    const replyId = replyTo?.id;
    setInputMessage('');
    setReplyTo(null);
    setSending(true);

    try {
      await api.sendMessage(roomId, text, replyId);
      scrollToBottom('smooth');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch message.');
      setInputMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    setShowEmojiPicker(null);
    inputRef.current?.focus();
  };

  const handleReact = async (messageId: string, emoji: string) => {
    setShowEmojiPicker(null);
    try {
      const res = await api.reactToMessage(roomId, messageId, emoji);
      // Update local state immediately for responsiveness
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, reactions: res.reactions } : msg
        )
      );
    } catch (err: any) {
      console.error('Failed to react:', err);
    }
  };

  const handleLeaveRoom = async () => {
    if (!window.confirm(`Leave the room "${room?.name}"?`)) return;
    try {
      await api.leaveRoom(roomId);
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to leave room.');
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const liveUsersSet = new Set(activeUsers);
  const onlineMembersList = roomMembers.filter(m => liveUsersSet.has(m.anonymous_username));
  const offlineMembersList = roomMembers.filter(m => !liveUsersSet.has(m.anonymous_username));

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowEmojiPicker(null);
    if (showEmojiPicker) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showEmojiPicker]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#07090e] overflow-hidden">
      {/* Top Room Header Bar */}
      <div className="glass-panel border-b border-white/[0.08] px-4 sm:px-6 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            id="chat-back-to-rooms-btn"
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Back to all rooms"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                #{room?.name || 'Chat Room'}
              </span>

              {/* Real-time Currently Live Indicator Pill */}
              <button
                id="chat-live-badge-btn"
                onClick={() => setShowLiveBar(!showLiveBar)}
                className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                title="Click to toggle currently live members bar"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{onlineCount} Currently Live</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 line-clamp-1 max-w-md hidden sm:block">
              {room?.description || 'Anonymous public discussion channel.'}
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center space-x-2">
          {!isConnected && (
            <span className="hidden sm:flex items-center space-x-1 text-xs text-amber-400 font-medium px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Reconnecting...</span>
            </span>
          )}

          <button
            id="chat-toggle-members-btn"
            onClick={() => {
              setShowMembersDrawer(!showMembersDrawer);
              loadMembers();
            }}
            className={`p-2 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 ${
              showMembersDrawer
                ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
            title="Room Members"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Members</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
              {roomMembers.length}
            </span>
          </button>

          <button
            id="chat-leave-room-btn"
            onClick={handleLeaveRoom}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all text-xs font-semibold flex items-center space-x-1.5"
            title="Leave this room"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>

      {/* Interactive Currently Live Quick Banner */}
      {showLiveBar && (
        <div className="bg-[#0b101c] border-b border-emerald-500/20 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center space-x-1 text-emerald-400 font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>Currently Live ({onlineCount}):</span>
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {activeUsers.length > 0 ? (
                activeUsers.map((name) => (
                  <span
                    key={name}
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
                      name === user?.anonymous_username
                        ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{name}</span>
                    {name === user?.anonymous_username && (
                      <span className="text-[9px] uppercase font-sans text-violet-400 font-bold ml-0.5">(You)</span>
                    )}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-[11px] italic">You are the only one in the room right now</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowLiveBar(false)}
            className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main chat body with optional members drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Messages Stream Column */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Scrollable message list */}
          <div 
            ref={chatContainerRef} 
            className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-4"
          >
            {/* Privacy notice banner at top of stream */}
            <div className="max-w-md mx-auto p-3 rounded-2xl bg-slate-900/40 border border-white/[0.06] text-center text-xs text-slate-400 mb-6">
              <span className="text-violet-400 font-semibold block mb-0.5">Anonymous Zone</span>
              Messages persist permanently in PostgreSQL. No emails, real names, or IPs are visible to other room participants.
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className="w-64 h-16 rounded-2xl bg-slate-800/40 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-3">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Silence in the Nexus</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
                  No messages have been posted in this room yet. Be the first to share an anonymous thought or ask a question!
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Hey everyone! 👋', 'What is everyone working on today?', 'Any recommendations on this topic?'].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInputMessage(prompt)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelf = msg.is_self;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} group`}
                  >
                    {/* Header with anonymous username */}
                    <div className="flex items-center space-x-2 px-1 mb-1">
                      <span className={`text-xs font-bold font-mono ${
                        isSelf ? 'text-violet-300' : 'text-cyan-400'
                      }`}>
                        {msg.anonymous_username}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] uppercase font-semibold px-1 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          You
                        </span>
                      )}
                    </div>

                    {/* Reply Preview Banner (if replying to another message) */}
                    {msg.reply_preview && (
                      <div className={`max-w-[85%] sm:max-w-[70%] mb-1 px-3 py-1.5 rounded-xl border border-white/[0.06] bg-slate-800/40 text-[11px] ${
                        isSelf ? 'mr-0' : 'ml-0'
                      }`}>
                        <div className="flex items-center space-x-1.5">
                          <Reply className="w-3 h-3 text-violet-400 shrink-0" />
                          <span className="font-bold text-violet-300 font-mono truncate">
                            {msg.reply_preview.anonymous_username}
                          </span>
                        </div>
                        <p className="text-slate-400 truncate mt-0.5">
                          {msg.reply_preview.message}
                        </p>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`relative max-w-[85%] sm:max-w-[70%] p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed break-words shadow-lg transition-all ${
                        isSelf
                          ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 text-white rounded-tr-sm shadow-violet-600/15'
                          : 'glass-card border border-white/10 text-slate-100 rounded-tl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>

                      {/* Hover actions: React + Reply */}
                      <div className={`absolute ${isSelf ? 'left-0 -translate-x-full pl-0 pr-1.5' : 'right-0 translate-x-full pr-0 pl-1.5'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1`}>
                        <button
                          onClick={() => handleReply(msg)}
                          className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white transition-all"
                          title="Reply"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white transition-all"
                          title="React"
                        >
                          <SmilePlus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Emoji Picker Popup */}
                      {showEmojiPicker === msg.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute ${isSelf ? 'right-0' : 'left-0'} -bottom-12 z-20 flex items-center space-x-1 p-1.5 rounded-xl bg-slate-800 border border-white/15 shadow-2xl`}
                        >
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReact(msg.id, emoji)}
                              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-base transition-all hover:scale-125"
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reactions row */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1 px-1">
                        {msg.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => handleReact(msg.id, r.emoji)}
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                              r.reacted_by_me
                                ? 'bg-violet-600/25 border-violet-500/50 text-violet-200 shadow-sm shadow-violet-500/15'
                                : 'bg-slate-800/60 border-white/[0.08] text-slate-300 hover:bg-slate-700/60'
                            }`}
                            title={`${r.count} reaction${r.count > 1 ? 's' : ''}`}
                          >
                            <span>{r.emoji}</span>
                            <span className="font-mono font-semibold text-[10px]">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center space-x-1 px-1 mt-1 text-[10px] text-slate-400">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatTimestamp(msg.created_at)}</span>
                      {isSelf && <CheckCheck className="w-3 h-3 text-violet-400 ml-0.5" />}
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          {typingUser && (
            <div className="px-6 py-1 text-xs text-violet-400 font-mono flex items-center space-x-2 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>{typingUser} is typing...</span>
            </div>
          )}

          {error && (
            <div className="mx-4 mb-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Reply-To Preview Bar */}
          {replyTo && (
            <div className="mx-4 sm:mx-5 mb-0 p-3 rounded-t-xl bg-slate-800/80 border border-b-0 border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <Reply className="w-4 h-4 text-violet-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-violet-300 font-mono block">
                    Replying to {replyTo.anonymous_username}
                  </span>
                  <p className="text-[11px] text-slate-400 truncate max-w-md">
                    {replyTo.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom Message Input Bar */}
          <div className={`p-4 sm:p-5 glass-panel border-t border-white/[0.08] bg-[#090d18]/90 ${replyTo ? 'pt-2' : ''}`}>
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  id="chat-message-input"
                  rows={1}
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={replyTo ? `Reply to ${replyTo.anonymous_username}...` : `Message #${room?.name || 'room'} anonymously... (Press Enter to send, Shift+Enter for newline)`}
                  maxLength={2000}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none max-h-32"
                />
                <span className="absolute right-3 bottom-2 text-[10px] text-slate-400 font-mono">
                  {inputMessage.length}/2000
                </span>
              </div>

              <button
                id="chat-send-message-btn"
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30 transition-all disabled:opacity-40 disabled:hover:from-violet-600 shrink-0"
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Collapsible Right Drawer: Room Members Breakdown */}
        {showMembersDrawer && (
          <aside className="w-72 glass-panel border-l border-white/[0.08] flex flex-col justify-between shrink-0 p-4 animate-fade-in">
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-10rem)] pr-1">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Users className="w-4 h-4 text-violet-400" />
                  <span>Room Members ({roomMembers.length})</span>
                </h3>
              </div>

              {/* 1. CURRENTLY LIVE SECTION */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-2">
                  <span className="flex items-center space-x-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Currently Live ({onlineMembersList.length})</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  {onlineMembersList.length > 0 ? (
                    onlineMembersList.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                            {m.anonymous_username.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-emerald-300 font-mono">
                              {m.anonymous_username}
                            </span>
                            <span className="text-[9px] text-emerald-400/80">
                              Active in room right now
                            </span>
                          </div>
                        </div>

                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                    ))
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-900/40 text-[11px] text-slate-400 italic">
                      No members currently live
                    </div>
                  )}
                </div>
              </div>

              {/* 2. OFFLINE MEMBERS SECTION */}
              {offlineMembersList.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-2">
                    Offline Members ({offlineMembersList.length})
                  </div>

                  <div className="space-y-1.5">
                    {offlineMembersList.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-slate-900/40 border border-white/[0.04] flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-400">
                            {m.anonymous_username.charAt(0)}
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            {m.anonymous_username}
                          </span>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/[0.07] text-[11px] text-slate-400 text-center">
              All member credentials protected
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
