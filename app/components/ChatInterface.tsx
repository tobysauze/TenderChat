import { useState, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { CrewProfile } from '../types';

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
  const [isTyping, setIsTyping] = useState(false);

  // Initial greeting
  useEffect(() => {
    const initialGreeting: Message = {
      id: 'initial',
      senderId: matchedProfile.id,
      text: `Hi ${currentUser.name}! Thanks for connecting. I'm currently ${matchedProfile.availability?.toLowerCase() || 'looking for opportunities'}.`,
      timestamp: new Date(),
    };
    setMessages([initialGreeting]);
  }, [matchedProfile.id, matchedProfile.availability, currentUser.name]);

  const simulateResponse = () => {
    setIsTyping(true);
    const responses = getAutomatedResponses(matchedProfile.role);
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Simulate typing delay between 1-3 seconds
    setTimeout(() => {
      const response: Message = {
        id: Date.now().toString(),
        senderId: matchedProfile.id,
        text: randomResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      text: newMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate response after a short delay
    simulateResponse();
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
          {messages.map(message => (
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
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-[20px] px-4 py-3">
                <p className="text-[#fd267a]">typing...</p>
              </div>
            </div>
          )}
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