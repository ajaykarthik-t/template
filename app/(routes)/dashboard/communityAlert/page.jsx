"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from "@clerk/clerk-react";

function CommunityAlert() {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState(1);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const storageKey = 'community_chat_messages';
  const activeUsersKey = 'community_chat_active_users';
  const userPresenceKey = 'community_chat_presence';

  // Get user name or default to Anonymous
  const userName = user?.fullName || "Anonymous User";
  const userId = user?.id || "anonymous";

  // Load messages from localStorage
  const loadMessages = () => {
    try {
      const storedMessages = localStorage.getItem(storageKey);
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages);
        
        // Filter out messages older than 24 hours
        const now = new Date();
        const validMessages = parsedMessages.filter(message => {
          const messageTime = new Date(message.timestamp);
          return (now - messageTime) < (24 * 60 * 60 * 1000);
        });
        
        setMessages(validMessages);
        
        // Update localStorage if we filtered any messages out
        if (validMessages.length !== parsedMessages.length) {
          localStorage.setItem(storageKey, JSON.stringify(validMessages));
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading messages from localStorage:", error);
      setLoading(false);
    }
  };

  // Update user presence
  const updatePresence = () => {
    try {
      // Get current presences
      const presenceData = localStorage.getItem(userPresenceKey);
      let presences = {};
      
      if (presenceData) {
        presences = JSON.parse(presenceData);
      }
      
      // Update current user's timestamp
      presences[userId] = {
        name: userName,
        timestamp: Date.now()
      };
      
      // Remove presences older than 30 seconds
      const now = Date.now();
      Object.keys(presences).forEach(id => {
        if (now - presences[id].timestamp > 30000) {
          delete presences[id];
        }
      });
      
      // Save updated presences
      localStorage.setItem(userPresenceKey, JSON.stringify(presences));
      
      // Update active users count
      setActiveUsers(Object.keys(presences).length);
      
      // Save active users count
      localStorage.setItem(activeUsersKey, Object.keys(presences).length);
    } catch (error) {
      console.error("Error updating presence:", error);
    }
  };

  // Poll for new messages and presence updates
  const pollForUpdates = () => {
    // Check for new messages
    try {
      const storedMessages = localStorage.getItem(storageKey);
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages);
        
        // Only update if the message count has changed
        if (parsedMessages.length !== messages.length) {
          // Filter out messages older than 24 hours
          const now = new Date();
          const validMessages = parsedMessages.filter(message => {
            const messageTime = new Date(message.timestamp);
            return (now - messageTime) < (24 * 60 * 60 * 1000);
          });
          
          setMessages(validMessages);
        }
      }
      
      // Update presence
      updatePresence();
      
      // Check active users
      const storedActiveUsers = localStorage.getItem(activeUsersKey);
      if (storedActiveUsers) {
        const activeUsersCount = parseInt(storedActiveUsers, 10);
        if (activeUsersCount !== activeUsers) {
          setActiveUsers(activeUsersCount);
        }
      }
    } catch (error) {
      console.error("Error polling for updates:", error);
    }
  };

  // Initialize and set up polling
  useEffect(() => {
    // Load initial messages
    loadMessages();
    
    // Update presence
    updatePresence();
    
    // Set up polling interval (every 2 seconds)
    pollIntervalRef.current = setInterval(pollForUpdates, 2000);
    
    // Clean up on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      
      // Remove user from active users
      try {
        const presenceData = localStorage.getItem(userPresenceKey);
        if (presenceData) {
          const presences = JSON.parse(presenceData);
          delete presences[userId];
          localStorage.setItem(userPresenceKey, JSON.stringify(presences));
          localStorage.setItem(activeUsersKey, Object.keys(presences).length);
        }
      } catch (error) {
        console.error("Error removing presence:", error);
      }
    };
  }, [userId, userName]);

  // Clean up expired messages periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      try {
        const storedMessages = localStorage.getItem(storageKey);
        if (storedMessages) {
          const parsedMessages = JSON.parse(storedMessages);
          
          // Filter out messages older than 24 hours
          const now = new Date();
          const validMessages = parsedMessages.filter(message => {
            const messageTime = new Date(message.timestamp);
            return (now - messageTime) < (24 * 60 * 60 * 1000);
          });
          
          // Update localStorage if we filtered any messages out
          if (validMessages.length !== parsedMessages.length) {
            localStorage.setItem(storageKey, JSON.stringify(validMessages));
            setMessages(validMessages);
          }
        }
      } catch (error) {
        console.error("Error cleaning up messages:", error);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = (messageType) => {
    if (!newMessage.trim() || !userId) return;
    
    try {
      // Create a new message
      const newMessageObj = {
        id: `${userId}-${Date.now()}`,
        text: newMessage,
        name: userName,
        userId: userId,
        timestamp: Date.now(),
        type: messageType
      };
      
      // Add message to state and localStorage
      const updatedMessages = [...messages, newMessageObj];
      setMessages(updatedMessages);
      localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
      
      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
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
  
  const handleEmergencyAlert = () => {
    // Request location if possible
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // With location
          const emergencyMessage = `EMERGENCY ALERT! Location: https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
          setNewMessage(emergencyMessage);
          sendMessage("emergency");
        },
        (error) => {
          // Without location
          console.error("Error getting location:", error);
          setNewMessage("EMERGENCY ALERT! I need help immediately!");
          sendMessage("emergency");
        }
      );
    } else {
      // Fallback without geolocation
      setNewMessage("EMERGENCY ALERT! I need help immediately!");
      sendMessage("emergency");
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get time remaining until message expires
  const getTimeRemaining = (timestamp) => {
    const messageTime = new Date(timestamp);
    const now = new Date();
    const timeDiff = 24 * 60 * 60 * 1000 - (now - messageTime); // 24 hours in ms
    
    if (timeDiff <= 0) return "Expiring soon";
    
    const hoursLeft = Math.floor(timeDiff / (60 * 60 * 1000));
    const minutesLeft = Math.floor((timeDiff % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hoursLeft > 0) {
      return `${hoursLeft}h left`;
    } else {
      return `${minutesLeft}m left`;
    }
  };

  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-2xl md:text-3xl">Safety Chat</h2>
        <div className="flex items-center">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center mr-3">
            <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            {activeUsers} online
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            {sortedMessages.length} Messages
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
          ) : sortedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-center">No messages yet. Be the first to send one!</p>
              <p className="text-xs mt-2 text-gray-400">Messages expire after 24 hours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Welcome message - always shown */}
              <div className="p-3 rounded-lg max-w-3xl bg-blue-100 text-blue-800 mx-auto text-center mb-6">
                <div className="flex items-center justify-center mb-1">
                  <strong className="text-sm">Safety Chat</strong>
                </div>
                <p className="text-sm">Welcome to the safety chat! Use the Emergency Alert button for urgent assistance.</p>
              </div>
              
              {/* Dynamic messages */}
              {sortedMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`p-3 rounded-lg max-w-3xl ${
                    message.userId === userId
                      ? 'ml-auto bg-purple-50 border border-purple-100'
                      : message.type === 'system'
                        ? 'bg-blue-100 text-blue-800 mx-auto text-center'
                        : message.type === 'alert'
                          ? 'bg-red-100 text-red-800'
                          : message.type === 'emergency'
                            ? 'bg-red-500 text-white'
                            : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <strong className="text-sm">{message.name}</strong>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.type === 'alert' && (
                        <span className="ml-2 bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full">
                          Alert
                        </span>
                      )}
                      {message.type === 'emergency' && (
                        <span className="ml-2 bg-white text-red-800 text-xs px-2 py-0.5 rounded-full animate-pulse">
                          EMERGENCY
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {getTimeRemaining(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{message.text}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message input */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200">
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={loading || !user}
            />
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-r-lg"
              disabled={loading || !newMessage.trim() || !user}
            >
              Send
            </button>
          </div>
          
          {/* Alert buttons */}
          <div className="mt-2 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Messages will disappear after 24 hours
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleAlertSubmit}
                className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 text-sm rounded-lg"
                disabled={loading || !newMessage.trim() || !user}
              >
                Send as Alert
              </button>
              <button
                type="button"
                onClick={handleEmergencyAlert}
                className="bg-red-800 hover:bg-red-900 text-white py-1.5 px-3 text-sm rounded-lg"
                disabled={loading || !user}
              >
                Emergency Alert
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Safety guidelines */}
      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-lg mb-2">Safety Chat Guidelines</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Use the 'Alert' option for safety concerns or incidents
          </li>
          <li className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Use 'Emergency Alert' for immediate assistance needs
          </li>
          <li className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Share your location for emergency alerts when possible
          </li>
        </ul>
      </div>
    </div>
  );
}

export default CommunityAlert;