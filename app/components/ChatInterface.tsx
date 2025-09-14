import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { CrewProfile } from '../types';
import { supabase } from '../../lib/supabase';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="chat-container w-full max-w-lg flex flex-col">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b flex items-center bg-white">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full mr-2"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
          <div className="flex items-center">
            <img 
              src={matchedProfile.imageUrl} 
              alt={matchedProfile.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-[#fd267a]"
            />
            <div className="ml-3">
              <h3 className="font-semibold text-lg">{matchedProfile.name}</h3>
              <p className="text-sm text-gray-500">{matchedProfile.role}</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-gray-500">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-gray-500 text-center">
                <p>Start the conversation!</p>
                <p className="text-sm mt-1">Send a message to begin chatting.</p>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <div 
                key={message.id}
                className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[70%] rounded-[20px] px-4 py-3 ${
                    message.senderId === currentUser.id 
                      ? 'bg-gradient-to-r from-[#fd267a] to-[#ff6036] text-white' 
                      : 'bg-white text-gray-900 border'
                  }`}
                >
                  <p className="text-[15px]">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderId === currentUser.id 
                      ? 'text-white/70' 
                      : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="message-input"
            />
            <button
              onClick={handleSendMessage}
              className="send-button"
              disabled={!newMessage.trim()}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 