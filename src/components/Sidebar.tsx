import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  User,
  Sparkles,
  WifiOff,
  HelpCircle,
  Menu,
  ChevronLeft
} from 'lucide-react';
import { Conversation, UserAccount } from '../types';
import { PWAInstallPrompt } from './PWAInstallPrompt';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  onOpenSettings: () => void;
  user: UserAccount;
  onOpenAuth: () => void;
  isOnline: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  currentChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onOpenSettings,
  user,
  onOpenAuth,
  isOnline,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container with Gemini exact dark palette (#1e1f20 surface) */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#1e1f20] border-r border-[#282a2c] text-[#e3e3e3] transition-all duration-250 ease-in-out md:static ${
          isOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-[68px]' : 'md:w-72'}`}
      >
        {/* Top Header: Hamburger Toggle + VEGA AI Branding */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#282a2c]/60">
          <div className="flex items-center gap-3 min-w-0">
            {/* Collapse toggle on desktop, close on mobile */}
            <button
              onClick={onToggleCollapse || onClose}
              id="sidebar-collapse-toggle"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#c4c7c5] hover:bg-[#282a2c] hover:text-white transition"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="h-5 w-5" />
            </button>

            {!isCollapsed && (
              <div className="flex items-center gap-2 truncate animate-in fade-in duration-200">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] text-white shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <span className="text-sm font-bold tracking-tight text-[#e3e3e3] font-['Plus_Jakarta_Sans',sans-serif]">
                    VEGA AI
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8e918f] hover:bg-[#282a2c] hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Gemini "+ New Chat" Pill Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            id="sidebar-new-chat-btn"
            className={`group flex items-center justify-center gap-2.5 rounded-full border border-[#333538] bg-[#1a1a1c] hover:bg-[#282a2c] hover:border-[#444746] py-2.5 px-4 text-xs font-semibold text-[#e3e3e3] shadow-xs transition-all w-full ${
              isCollapsed ? 'md:px-2 md:py-2.5 md:rounded-full' : ''
            }`}
            title="New Chat"
          >
            <Plus className="h-4 w-4 text-[#a8c7fa] group-hover:scale-110 transition-transform" />
            {!isCollapsed && <span className="tracking-wide">New chat</span>}
          </button>
        </div>

        {/* Search Bar (only when not collapsed) */}
        {!isCollapsed && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8e918f]" />
              <input
                type="text"
                id="sidebar-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full rounded-full border border-[#2e3134] bg-[#131314] pl-9 pr-8 py-1.5 text-xs text-[#e3e3e3] placeholder:text-[#8e918f] focus:outline-none focus:border-[#444746] focus:ring-1 focus:ring-[#444746]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-[#8e918f] hover:text-[#e3e3e3]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Recent Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {!isCollapsed && (
            <div className="px-3 py-2 text-[11px] font-semibold text-[#8e918f] tracking-wider uppercase">
              Recent
            </div>
          )}

          {filtered.length === 0 ? (
            !isCollapsed && (
              <div className="px-4 py-8 text-center text-xs text-[#8e918f]">
                {searchQuery ? 'No matching chats found.' : 'No recent chats.'}
              </div>
            )
          ) : (
            filtered.map((conv) => {
              const isSelected = conv.id === currentChatId;
              const isEditing = conv.id === editingId;

              return (
                <div
                  key={conv.id}
                  id={`chat-item-${conv.id}`}
                  onClick={() => {
                    onSelectChat(conv.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`group relative flex items-center justify-between gap-2 rounded-full px-3 py-2 text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#004a77]/40 text-[#c2e7ff] font-medium'
                      : 'text-[#c4c7c5] hover:bg-[#282a2c] hover:text-[#e3e3e3]'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  title={isCollapsed ? conv.title : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? 'text-[#7cacf8]' : 'text-[#8e918f]'
                      }`}
                    />
                    {!isCollapsed && (
                      isEditing ? (
                        <form
                          onSubmit={(e) => saveRename(conv.id, e)}
                          className="flex items-center gap-1 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded border border-[#444746] bg-[#131314] px-2 py-0.5 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#7cacf8]"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelRename}
                            className="p-1 text-[#8e918f] hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </form>
                      ) : (
                        <span className="truncate flex-1 text-xs">
                          {conv.title}
                        </span>
                      )
                    )}
                  </div>

                  {/* Actions on hover */}
                  {!isCollapsed && !isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRename(conv, e)}
                        id={`rename-chat-${conv.id}`}
                        className="p-1 text-[#8e918f] hover:text-[#e3e3e3]"
                        title="Rename"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(conv.id);
                        }}
                        id={`delete-chat-${conv.id}`}
                        className="p-1 text-[#8e918f] hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Gemini Bottom Links: PWA, Settings, User Profile */}
        <div className="border-t border-[#282a2c] p-2 space-y-1">
          {!isCollapsed && (
            <div className="px-1">
              <PWAInstallPrompt variant="compact" />
            </div>
          )}

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            id="sidebar-settings-btn"
            className={`flex w-full items-center gap-3 rounded-full px-3 py-2 text-xs font-medium text-[#c4c7c5] hover:bg-[#282a2c] hover:text-[#e3e3e3] transition ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Settings"
          >
            <Settings className="h-4 w-4 text-[#8e918f] shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button>

          {/* User Account / Profile link */}
          <button
            onClick={onOpenAuth}
            id="sidebar-user-btn"
            className={`flex w-full items-center gap-3 rounded-full px-3 py-2 text-xs font-medium text-[#c4c7c5] hover:bg-[#282a2c] hover:text-[#e3e3e3] transition ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title={user.isLoggedIn ? user.name : 'Account'}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#4285f4] to-[#9b72cb] text-white font-semibold text-[11px] shadow-xs">
              {user.isLoggedIn ? user.name.slice(0, 1).toUpperCase() : 'A'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left truncate flex-1 min-w-0">
                <span className="truncate text-xs font-medium text-[#e3e3e3]">
                  {user.isLoggedIn ? user.name : 'Aziz (azizme12345)'}
                </span>
                <span className="text-[10px] text-[#8e918f] truncate">
                  {user.isLoggedIn ? user.email : 'VEGA AI Pro'}
                </span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
