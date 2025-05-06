"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from "@clerk/clerk-react";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  limit
} from "firebase/firestore";

// Your Firebase configuration
// Replace these values with your actual Firebase project details
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function CommunityAlert() {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const [activeUsers, setActiveUsers] = useState(1); // Start with at least one

  // Subscribe to messages in real-time
  useEffect(() => {
    // Create a query to get messages ordered by timestamp
    const messagesQuery = query(
      collection(db, "messages"),
      orderBy("timestamp", "asc"),
      limit(100) // Limit to last 100 messages for performance
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messageList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messageList.push({
          id: doc.id,
          name: data.name,
          text: data.text,
          timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(),
          type: data.type
        });
      });
      
      setMessages(messageList);
      setLoading(false);
      
      // Simulate random active users between 2-15
      setActiveUsers(Math.floor(Math.random() * 14) + 2);
    });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Function to send a message to Firestore
  const sendMessageToFirestore = async (messageType) => {
    if (!newMessage.trim()) return;
    
    try {
      // Add new document to "messages" collection
      await addDoc(collection(db, "messages"), {
        name: user?.fullName || "Anonymous User",
        text: newMessage,
        timestamp: serverTimestamp(), // Server timestamp for accurate ordering
        type: messageType
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
    sendMessageToFirestore("message");
  };

  const handleAlertSubmit = () => {
    sendMessageToFirestore("alert");
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Function to check if user is currently typing (for a real app, this would use Firebase presence)
  const [typingUsers, setTypingUsers] = useState([]);
  
  // Simulate typing indicators (in a real app, this would use Firebase)
  useEffect(() => {
    if (newMessage.trim() && user?.fullName) {
      // In a real app, would update a 'typing' status in Firebase
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
              {/* Welcome message that always shows at the top */}
              <div className="p-3 rounded-lg max-w-3xl bg-blue-100 text-blue-800 mx-auto text-center mb-6">
                <div className="flex items-center justify-center mb-1">
                  <strong className="text-sm">Safety Admin</strong>
                </div>
                <p className="text-sm">Welcome to Community Alerts! This is a safe space to share safety tips and report incidents in your area.</p>
              </div>
              
              {/* Dynamic messages */}
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