import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Profile {
  bio: string;
  tone: 'casual' | 'professional' | 'humorous';
  avoidWords: string[];
  interests: string[];
}

export interface Capture {
  id: string;
  text: string;
  image?: string; // base64
  timestamp: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  id: string;
  captureId?: string;
  messages: Message[];
  output?: string;
  timestamp: number;
}

interface Store {
  // State
  profile: Profile | null;
  captures: Capture[];
  conversations: Conversation[];
  currentConversationId: string | null;

  // Actions
  setProfile: (profile: Profile) => void;
  addCapture: (capture: Capture) => void;
  deleteCapture: (id: string) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  setCurrentConversationId: (id: string | null) => void;
  getCurrentConversation: () => Conversation | null;
  addMessageToCurrentConversation: (message: Message) => void;
  updateLastAssistantMessage: (content: string) => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      captures: [],
      conversations: [],
      currentConversationId: null,

      // Actions
      setProfile: (profile) => set({ profile }),

      addCapture: (capture) =>
        set((state) => ({
          captures: [capture, ...state.captures],
        })),

      deleteCapture: (id) =>
        set((state) => ({
          captures: state.captures.filter((c) => c.id !== id),
        })),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: conversation.id,
        })),

      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      setCurrentConversationId: (id) => set({ currentConversationId: id }),

      getCurrentConversation: () => {
        const state = get();
        if (!state.currentConversationId) return null;
        return (
          state.conversations.find(
            (c) => c.id === state.currentConversationId
          ) || null
        );
      },

      addMessageToCurrentConversation: (message) =>
        set((state) => {
          if (!state.currentConversationId) return state;
          return {
            conversations: state.conversations.map((c) =>
              c.id === state.currentConversationId
                ? { ...c, messages: [...c.messages, message] }
                : c
            ),
          };
        }),

      updateLastAssistantMessage: (content) =>
        set((state) => {
          if (!state.currentConversationId) return state;
          return {
            conversations: state.conversations.map((c) => {
              if (c.id !== state.currentConversationId) return c;
              const messages = [...c.messages];
              const lastIndex = messages.length - 1;
              if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
                messages[lastIndex] = { ...messages[lastIndex], content };
              }
              return { ...c, messages };
            }),
          };
        }),
    }),
    {
      name: 'voice-builder-storage',
    }
  )
);

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
