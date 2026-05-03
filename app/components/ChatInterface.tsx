import { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import { CrewProfile } from '../types';
import { supabase } from '../../lib/supabase';
import ProfileView from './ProfileView';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  matchedProfile: CrewProfile;
  currentUser: any; // Accept any user type for now
  onClose: () => void;
}

// Automated responses based on role
const getAutomatedResponses = (role: string): string[] => {
  const commonResponses = [
    "Thanks for reaching out!",
    "Great to connect with you.",
    "How's your current position?",
    "Are you currently on a yacht?",
    "What size vessels have you worked on?",
  ];

  const roleSpecificResponses: Record<string, string[]> = {
    Captain: [
      "I'm always looking for skilled crew members.",
      "Safety and professionalism are my top priorities.",
      "What's your experience with Mediterranean routes?",
      "Have you worked on similar sized vessels?",
    ],
    "Chief Engineer": [
      "What systems are you most familiar with?",
      "Do you have experience with stabilization systems?",
      "Have you worked with hybrid propulsion?",
      "What's your take on preventive maintenance?",
    ],
    Chef: [
      "What's your specialty cuisine?",
      "Do you have experience with dietary restrictions?",
      "Have you managed provisions for long trips?",
      "What's your signature dish?",
    ],
    "Chief Stewardess": [
      "What's your interior management style?",
      "Do you have experience with silver service?",
      "How do you handle guest preferences?",
      "What's your approach to team leadership?",
    ],
    Deckhand: [
      "What's your experience with water toys?",
      "Are you comfortable with night watches?",
      "Do you have any additional certifications?",
      "What's your strongest deck skill?",
    ],
  };

  const defaultResponses = [
    "What's your availability like?",
    "What ports do you prefer?",
    "Do you have any specific yacht preferences?",
  ];

  const specificResponses = roleSpecificResponses[role] || defaultResponses;
  return [...commonResponses, ...specificResponses];
};

export default function ChatInterface({ matchedProfile, currentUser, onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // iOS Safari sometimes leaves the input under the keyboard. Wait for the
  // keyboard animation, then scroll the input + last message into view.
  const handleInputFocus = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 300);
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get the match ID for this conversation
  useEffect(() => {
    const getMatchId = async () => {
      if (!currentUser || !matchedProfile) return;

      const { data, error } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${matchedProfile.user_id}),and(user1_id.eq.${matchedProfile.user_id},user2_id.eq.${currentUser.id})`)
        .single();

      if (data) {
        setMatchId(data.id);
      }
    };

    getMatchId();
  }, [currentUser, matchedProfile]);

  // Load real messages from the database
  useEffect(() => {
    if (!matchId) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formattedMessages: Message[] = data?.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          text: msg.content,
          timestamp: new Date(msg.created_at),
        })) || [];

        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel(`messages:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        console.log('Real-time message received:', payload);
        const newMessage: Message = {
          id: payload.new.id,
          senderId: payload.new.sender_id,
          text: payload.new.content,
          timestamp: new Date(payload.new.created_at),
        };
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    // Fallback: Poll for new messages every 2 seconds if real-time fails
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formattedMessages: Message[] = data?.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          text: msg.content,
          timestamp: new Date(msg.created_at),
        })) || [];

        setMessages(prev => {
          // Only update if we have new messages
          if (formattedMessages.length > prev.length) {
            return formattedMessages;
          }
          return prev;
        });
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [matchId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !matchId || !currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: currentUser.id,
          content: messageText,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      // Re-add the message to the input if sending failed
      setNewMessage(messageText);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-0 sm:p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl shadow-2xl h-[100dvh] sm:h-auto sm:max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3 py-3 border-b flex items-center bg-white shrink-0">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full mr-1 text-gray-500"
            aria-label="Close chat"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="flex items-center hover:opacity-80 text-left flex-1 min-w-0"
          >
            <img
              src={matchedProfile.imageUrl}
              alt={matchedProfile.name}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-[var(--tender-red)]"
            />
            <div className="ml-3 min-w-0">
              <h3 className="font-semibold text-base text-[var(--tender-navy)] truncate">{matchedProfile.name}</h3>
              <p className="text-xs text-gray-500 truncate">{matchedProfile.role} · Tap to view profile</p>
            </div>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gradient-to-b from-gray-50 to-white">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tender-red)]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-full bg-[var(--tender-red)]/10 flex items-center justify-center mb-3">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-[var(--tender-red)]" />
              </div>
              <p className="text-[var(--tender-navy)] font-semibold">You matched!</p>
              <p className="text-sm text-gray-500 mt-1">Send a message to break the ice.</p>
            </div>
          ) : (
            messages.map((message, i) => {
              const isMe = message.senderId === currentUser.id;
              const prev = i > 0 ? messages[i - 1] : null;
              const next = i < messages.length - 1 ? messages[i + 1] : null;
              const isFirstInGroup = !prev || prev.senderId !== message.senderId;
              const isLastInGroup = !next || next.senderId !== message.senderId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'pt-2' : ''}`}
                >
                  <div
                    className={`max-w-[78%] px-4 py-2.5 shadow-sm break-words ${
                      isMe
                        ? `bg-[var(--tender-red)] text-white ${isLastInGroup ? 'rounded-br-md' : ''} ${isFirstInGroup ? 'rounded-tr-2xl' : 'rounded-tr-md'} rounded-l-2xl`
                        : `bg-white text-[var(--tender-navy)] border border-gray-100 ${isLastInGroup ? 'rounded-bl-md' : ''} ${isFirstInGroup ? 'rounded-tl-2xl' : 'rounded-tl-md'} rounded-r-2xl`
                    }`}
                  >
                    <p className="text-[15px] leading-snug whitespace-pre-wrap">{message.text}</p>
                    {isLastInGroup && (
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full pl-4 pr-1 py-1 focus-within:ring-2 focus-within:ring-[var(--tender-red)]/30">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              onFocus={handleInputFocus}
              placeholder="Type a message…"
              className="flex-1 bg-transparent focus:outline-none text-[15px] text-[var(--tender-navy)] placeholder:text-gray-400 py-2"
              style={{ fontSize: '16px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="w-10 h-10 rounded-full bg-[var(--tender-red)] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shrink-0"
              aria-label="Send"
            >
              <PaperAirplaneIcon className="w-5 h-5 -rotate-12" />
            </button>
          </div>
        </div>
      </div>

      {showProfile && (
        <ProfileView
          profile={{
            name: matchedProfile.name,
            age: matchedProfile.age,
            role: matchedProfile.role,
            experience: matchedProfile.experience,
            nationality: matchedProfile.nationality,
            bio: matchedProfile.bio,
            availability: matchedProfile.availability,
            languages: matchedProfile.languages,
            certifications: matchedProfile.certifications,
            interests: matchedProfile.interests,
            photos: matchedProfile.photos || [{ url: matchedProfile.imageUrl, order: 0 }],
          }}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
} 