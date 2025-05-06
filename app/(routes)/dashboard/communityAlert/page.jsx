"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from "@clerk/clerk-react";

// This is a simulated backend service that would typically be replaced
// with a real backend API in production
class MockChatService {
  static listeners = [];
  static messages = [
    {
      id: '1',
      name: "Safety Admin",
      text: "Welcome to Community Alerts! This is a safe space to share safety tips and report incidents in your area.",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: "system"
    }
  ];
  static activeUsers = 3;

  static subscribe(callback) {
    this.listeners.push(callback);
    callback(this.messages, this.activeUsers);
    
    // Simulate other users occasionally joining/leaving
    const userInterval = setInterval(() => {
      this.activeUsers = Math.max(1, Math.floor(Math.random() * 8) + 1);
      this.notifyListeners();
    }, 30000);
    
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
      clearInterval(userInterval);
    };
  }

  static addMessage(message) {
    const newMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    this.messages = [...this.messages, newMessage];
    this.notifyListeners();
    
    // In a real app, this would be an API call to your backend
    return Promise.resolve(newMessage);
  }

  static notifyListeners() {
    this.listeners.forEach(callback => callback(this.messages, this.activeUsers));
  }
}

function CommunityAlert() {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState(1);
  const messagesEndRef = useRef(null);

  // Subscribe to chat updates
  useEffect(() => {
    // Simulate a connection delay for realism
    const loadingTimeout = setTimeout(() => {
      const unsubscribe = MockChatService.subscribe((updatedMessages, updatedActiveUsers) => {
        setMessages(updatedMessages);
        setActiveUsers(updatedActiveUsers);
        setLoading(false);
      });
      
      return () => {
        clearTimeout(loadingTimeout);
        unsubscribe();
      };
    }, 1000);
    
    return () => clearTimeout(loadingTimeout);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message function
  const sendMessage = async (messageType) => {
    if (!newMessage.trim()) return;
    
    try {
      await MockChatService.addMessage({
        name: user?.fullName || "Anonymous User",
        text: newMessage,
        type: messageType,
      });
      
      // Clear input field
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendMessage("message");
  };

  const handleAlertSubmit = () => {
    sendMessage("alert");
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Simulate typing indicators
  const [typingUsers, setTypingUsers] = useState([]);
  
  useEffect(() => {
    if (newMessage.trim() && user?.fullName) {
      // In a real app, would update a 'typing' status on the server
      console.log(`${user.fullName} is typing...`);
    }
  }, [newMessage, user]);

  // Generate typing indicator text
  const getTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    } else {
      return "Several people are typing...";
    }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-2xl md:text-3xl">Community Alert</h2>
        <div className="flex items-center">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center mr-3">
            <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            {activeUsers} online
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            {messages.filter(m => m.type !== 'system').length} Messages
          </div>
        </div>
      </div>
      
      {/* Chat container */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        {/* Chat messages */}
        <div className="h-96 p-4 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-center">No messages yet. Be the first to send one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`p-3 rounded-lg max-w-3xl ${
                    message.type === 'system' 
                      ? 'bg-blue-100 text-blue-800 mx-auto text-center' 
                      : message.type === 'alert' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center mb-1">
                    <strong className="text-sm">{message.name}</strong>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.type === 'alert' && (
                      <span className="ml-2 bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full">
                        Alert
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{message.text}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1 text-xs text-gray-500 italic">
            {getTypingIndicator()}
          </div>
        )}
        
        {/* Message input */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200">
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-r-lg"
              disabled={loading || !newMessage.trim()}
            >
              Send
            </button>
          </div>
          
          {/* Alert button */}
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={handleAlertSubmit}
              className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 text-sm rounded-lg"
              disabled={loading || !newMessage.trim()}
            >
              Send as Alert
            </button>
          </div>
        </form>
      </div>
      
      {/* Community guidelines */}
      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-lg mb-2">Community Chat Guidelines</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Use the 'Alert' option for urgent safety concerns or incidents
          </li>
          <li className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Be respectful and supportive of community members
          </li>
          <li className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Share verified information only to avoid panic
          </li>
        </ul>
      </div>
      
      {/* Nearby emergency contacts */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="font-semibold text-lg mb-3">Emergency Contacts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium mb-1">Police</h4>
            <a href="tel:100" className="text-blue-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              100
            </a>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium mb-1">Women's Helpline</h4>
            <a href="tel:1091" className="text-blue-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              1091
            </a>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium mb-1">Ambulance</h4>
            <a href="tel:108" className="text-blue-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              108
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommunityAlert;