"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from "@clerk/clerk-react";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  getDocs,
  limit 
} from 'firebase/firestore';
import {
  ref,
  onValue,
  set,
  onDisconnect
} from 'firebase/database';
import { db, realDb } from '../../../../lib/firebase';

function CommunityAlert() {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState(0);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Get user name or default to Anonymous
  const userName = user?.fullName || "Anonymous User";
  const userId = user?.id || "anonymous";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userPhone = user?.primaryPhoneNumber?.phoneNumber || "";

  // Check Firebase connection
  useEffect(() => {
    console.log("Checking Firebase connection...");
    try {
      // Test Firestore connection
      const testConnection = async () => {
        try {
          await getDocs(collection(db, "messages")).then(() => {
            console.log("✅ Firestore connected successfully");
            setFirebaseConnected(true);
          });
        } catch (error) {
          console.error("❌ Firestore connection error:", error);
        }
      };
      
      testConnection();
    } catch (error) {
      console.error("Firebase initialization error:", error);
    }
    
    // Force loading to end after 5 seconds to prevent infinite loading
    const timer = setTimeout(() => {
      if (loading) {
        console.log("Loading timeout reached - forcing loading to end");
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [loading]);

  // Set up Firestore listener for messages
  useEffect(() => {
    if (!firebaseConnected) return;
    
    try {
      console.log("Setting up Firestore messages listener");
      
      const messagesRef = collection(db, "messages");
      const messagesQuery = query(
        messagesRef, 
        orderBy("timestamp", "asc")
      );
      
      const unsubscribe = onSnapshot(
        messagesQuery,
        { includeMetadataChanges: true },  // Important for real-time updates
        (snapshot) => {
          console.log("📩 Firestore data received:", snapshot.docs.length, "messages");
          
          const messageList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.().getTime() || 
                      doc.data().clientTimestamp || 
                      Date.now()
          }));
          
          setMessages(messageList);
          setLoading(false);
        },
        (error) => {
          console.error("❌ Firestore messages error:", error);
          setLoading(false);
        }
      );
      
      return () => {
        console.log("Unsubscribing from Firestore messages");
        unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up Firestore messages:", error);
      setLoading(false);
    }
  }, [firebaseConnected]);

  // Set up presence system
  useEffect(() => {
    if (!firebaseConnected || !userId || userId === "anonymous") return;
    
    try {
      console.log("Setting up presence system for user:", userId);
      
      // Set up presence reference
      const presenceRef = ref(realDb, `presence/${userId}`);
      
      // Online status
      set(presenceRef, {
        name: userName,
        email: userEmail,
        phone: userPhone,
        online: true,
        lastActive: Date.now()
      });
      
      // Remove when disconnected
      onDisconnect(presenceRef).remove();
      
      // Get active users count
      const allPresenceRef = ref(realDb, 'presence');
      
      const presenceUnsubscribe = onValue(allPresenceRef, (snapshot) => {
        const users = snapshot.val() || {};
        const userCount = Object.keys(users).length;
        console.log("👥 Active users:", userCount);
        setActiveUsers(userCount);
      });
      
      return () => {
        console.log("Cleaning up presence for user:", userId);
        presenceUnsubscribe();
        // Remove user when component unmounts
        set(presenceRef, null);
      };
    } catch (error) {
      console.error("Error setting up presence:", error);
    }
  }, [userId, userName, userEmail, userPhone, firebaseConnected]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Location sharing function
  const shareLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      
      const locationURL = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
      
      // Append location to existing message or create new one
      setNewMessage(prev => {
        if (prev.trim()) {
          return `${prev}\n\nMy current location: ${locationURL}`;
        } else {
          return `My current location: ${locationURL}`;
        }
      });
      
    } catch (error) {
      console.error("Error getting location:", error);
      alert("Failed to get your location. Please check your location permissions.");
    }
  };

  // Send message
  const sendMessage = async (messageType) => {
    if (!newMessage.trim() || !userId) return;
    
    try {
      console.log("Sending message:", messageType);
      
      // Get location for emergency messages
      let locationData = null;
      
      if (messageType === 'emergency' && navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });
          
          locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
        } catch (error) {
          console.error("Error getting location:", error);
          // Continue without location
        }
      }
      
      // Create a new message
      await addDoc(collection(db, "messages"), {
        text: newMessage,
        name: userName,
        userId: userId,
        email: userEmail,
        phone: userPhone,
        timestamp: serverTimestamp(), // Server timestamp will ensure consistency
        clientTimestamp: Date.now(),  // Fallback client timestamp
        type: messageType,
        location: locationData
      });
      
      console.log("✅ Message sent successfully");
      
      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error("❌ Error sending message:", error);
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
  
  // Enhanced Emergency Alert function
  const handleEmergencyAlert = async () => {
    try {
      // If no message is set, use a default emergency message
      if (!newMessage.trim()) {
        setNewMessage("EMERGENCY ALERT! I need immediate assistance!");
      }
      
      // Always try to get location for emergency alerts
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        
        // Create location object
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        // Add to message text for clarity
        const locationText = `\n\nMy exact location: https://maps.google.com/?q=${locationData.latitude},${locationData.longitude}`;
        setNewMessage(prev => prev + locationText);
        
        // Add device info for emergency context
        const deviceInfo = `\n\nDevice info: ${navigator.userAgent}`;
        setNewMessage(prev => prev + deviceInfo);
      }
    } catch (error) {
      console.error("Error in emergency alert:", error);
      // Continue without location if there's an error
    }
    
    // Send as emergency message
    sendMessage("emergency");
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

  // Sort messages by timestamp - ensure consistent sorting
  const sortedMessages = [...messages].sort((a, b) => {
    // Normalize timestamps to numbers
    const aTime = typeof a.timestamp === 'number' ? a.timestamp : 0;
    const bTime = typeof b.timestamp === 'number' ? b.timestamp : 0;
    return aTime - bTime;
  });

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
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  
                  {/* Enhanced location display for emergency messages */}
                  {message.type === 'emergency' && message.location && (
                    <div className="mt-2 text-xs border-t border-red-300 pt-2">
                      <p className="font-bold flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Location (Accuracy: ~{Math.round(message.location.accuracy)}m):
                      </p>
                      <div className="mt-1 flex flex-col">
                        <span className="text-xs">
                          Coordinates: {message.location.latitude.toFixed(6)}, {message.location.longitude.toFixed(6)}
                        </span>
                        <a 
                          href={`https://maps.google.com/?q=${message.location.latitude},${message.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center text-red-700 font-semibold"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View on Map
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* Directions feature for emergency messages */}
                  {message.type === 'emergency' && message.location && (
                    <div className="mt-1">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${message.location.latitude},${message.location.longitude}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Get Directions
                      </a>
                    </div>
                  )}
                  
                  {/* Contact info for emergency messages */}
                  {message.type === 'emergency' && (
                    <div className="mt-2 text-xs border-t pt-2">
                      <p className="font-bold">Contact Info:</p>
                      {message.email && <p>Email: {message.email}</p>}
                      {message.phone && <p>Phone: {message.phone}</p>}
                    </div>
                  )}
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
              disabled={!user}
            />
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-r-lg"
              disabled={!newMessage.trim() || !user}
            >
              Send
            </button>
          </div>
          
          {/* Location sharing button */}
          <div className="flex items-center mt-2 text-xs text-gray-500">
            <button
              type="button"
              onClick={() => shareLocation()}
              className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Share Location
            </button>
            <span>Messages will disappear after 24 hours</span>
          </div>
          
          {/* Alert buttons */}
          <div className="mt-2 flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleAlertSubmit}
                className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 text-sm rounded-lg"
                disabled={!newMessage.trim() || !user}
              >
                Send as Alert
              </button>
              <button
                type="button"
                onClick={handleEmergencyAlert}
                className="bg-red-800 hover:bg-red-900 text-white py-1.5 px-3 text-sm rounded-lg"
                disabled={!user}
              >
                Emergency Alert
              </button>
            </div>
          </div>
          
          {/* Emergency Templates Dropdown */}
          <div className="mt-2">
            <select 
              className="w-full p-2 border border-gray-300 rounded text-sm bg-gray-50"
              onChange={(e) => {
                if (e.target.value) {
                  setNewMessage(e.target.value);
                }
              }}
              value=""
            >
              <option value="">-- Emergency Message Templates --</option>
              <option value="EMERGENCY ALERT! I need immediate assistance at my current location!">Need Immediate Help</option>
              <option value="EMERGENCY! Medical assistance required urgently!">Medical Emergency</option>
              <option value="ALERT! I'm being followed/stalked. Need assistance.">Being Followed</option>
              <option value="EMERGENCY! I'm in an unsafe situation and need help.">Unsafe Situation</option>
              <option value="ALERT! I'm stranded and need help. My phone battery is low.">Stranded/Battery Low</option>
            </select>
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