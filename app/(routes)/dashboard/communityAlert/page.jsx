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
        { includeMetadataChanges: true },
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

  // Enhanced Location sharing function with SMS option
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
      
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const locationURL = `https://maps.google.com/?q=${lat},${lng}`;
      
      // Append location to existing message or create new one
      setNewMessage(prev => {
        const locationText = `My current location: ${locationURL}`;
        if (prev.trim()) {
          return `${prev}\n\n${locationText}`;
        } else {
          return locationText;
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
        timestamp: serverTimestamp(),
        clientTimestamp: Date.now(),
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

  // Create SMS link for location sharing
  const createSmsLink = (lat, lng, emergencyText = "") => {
    // Format the SMS message with location and emergency text
    const message = encodeURIComponent(
      `${emergencyText ? emergencyText + " - " : ""}My location: https://maps.google.com/?q=${lat},${lng}`
    );
    return `sms:?&body=${message}`;
  };

  // Create WhatsApp link for location sharing
  const createWhatsAppLink = (lat, lng, emergencyText = "") => {
    const message = encodeURIComponent(
      `${emergencyText ? emergencyText + " - " : ""}My location: https://maps.google.com/?q=${lat},${lng}`
    );
    return `https://wa.me/?text=${message}`;
  };

  // Sort messages by timestamp - ensure consistent sorting
  const sortedMessages = [...messages].sort((a, b) => {
    // Normalize timestamps to numbers
    const aTime = typeof a.timestamp === 'number' ? a.timestamp : 0;
    const bTime = typeof b.timestamp === 'number' ? b.timestamp : 0;
    return aTime - bTime;
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-purple-600 to-blue-500 p-4 rounded-lg text-white shadow-lg">
        <h2 className="font-bold text-2xl md:text-3xl flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          Safety Chat
        </h2>
        <div className="flex items-center space-x-2">
          <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
            <span className="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            {activeUsers} online
          </div>
          <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
            {sortedMessages.length} Messages
          </div>
        </div>
      </div>
      
      {/* Chat container */}
      <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-4 border border-gray-100">
        {/* Chat messages */}
        <div className="h-96 p-4 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-3 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-center text-lg font-medium">No messages yet. Be the first to send one!</p>
              <p className="text-sm mt-2 text-gray-400">Messages expire after 24 hours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Welcome message - always shown */}
              <div className="p-4 rounded-lg max-w-3xl bg-gradient-to-r from-blue-500 to-blue-600 text-white mx-auto text-center mb-6 shadow-md">
                <div className="flex items-center justify-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <strong className="text-lg">Safety Chat</strong>
                </div>
                <p>Welcome to the safety chat! Use the Emergency Alert button for urgent assistance.</p>
              </div>
              
              {/* Dynamic messages */}
              {sortedMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`p-4 rounded-xl max-w-3xl ${
                    message.userId === userId
                      ? 'ml-auto bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 shadow-sm'
                      : message.type === 'system'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white mx-auto text-center shadow-md'
                        : message.type === 'alert'
                          ? 'bg-gradient-to-r from-amber-100 to-red-100 border border-red-200 shadow-md'
                          : message.type === 'emergency'
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                            : 'bg-white border border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <strong className={`${message.type === 'emergency' ? 'text-white' : ''}`}>
                        {message.name}
                      </strong>
                      <span className={`text-xs ml-2 ${
                        message.type === 'emergency' ? 'text-white/80' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </span>
                      {message.type === 'alert' && (
                        <span className="ml-2 bg-red-200 text-red-800 text-xs px-3 py-1 rounded-full font-medium">
                          Alert
                        </span>
                      )}
                      {message.type === 'emergency' && (
                        <span className="ml-2 bg-white text-red-800 text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                          EMERGENCY
                        </span>
                      )}
                    </div>
                    <span className={`text-xs ${
                      message.type === 'emergency' ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      {getTimeRemaining(message.timestamp)}
                    </span>
                  </div>
                  <p className={`whitespace-pre-line ${
                    message.type === 'emergency' ? 'text-white font-medium' : ''
                  }`}>
                    {message.text}
                  </p>
                  
                  {/* Enhanced location display for emergency messages */}
                  {message.type === 'emergency' && message.location && (
                    <div className="mt-3 border-t border-red-300 pt-3">
                      <div className="bg-white/10 p-3 rounded-lg">
                        <p className="font-bold text-white flex items-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Location (Accuracy: ~{Math.round(message.location.accuracy)}m)
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {/* View on Map */}
                          <a 
                            href={`https://maps.google.com/?q=${message.location.latitude},${message.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center bg-white text-red-600 font-medium rounded-lg py-2 px-3 shadow-sm hover:bg-gray-50 transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            View on Map
                          </a>
                          
                          {/* Get Directions */}
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${message.location.latitude},${message.location.longitude}&travelmode=driving`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center bg-white text-blue-600 font-medium rounded-lg py-2 px-3 shadow-sm hover:bg-gray-50 transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Get Directions
                          </a>
                        </div>
                          
                        <div className="grid grid-cols-2 gap-2">
                          {/* SMS Share */}
                          <a 
                            href={createSmsLink(message.location.latitude, message.location.longitude, "EMERGENCY")}
                            className="flex items-center justify-center bg-green-500 text-white font-medium rounded-lg py-2 px-3 shadow-sm hover:bg-green-600 transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Share via SMS
                          </a>
                          
                          {/* WhatsApp Share */}
                          <a 
                            href={createWhatsAppLink(message.location.latitude, message.location.longitude, "EMERGENCY")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center bg-green-600 text-white font-medium rounded-lg py-2 px-3 shadow-sm hover:bg-green-700 transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Share via WhatsApp
                          </a>
                        </div>
                      </div>
                  
                      {/* Contact info for emergency messages */}
                      {(message.email || message.phone) && (
                        <div className="mt-3 bg-white/10 p-3 rounded-lg">
                          <p className="font-bold text-white flex items-center mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                            Contact Info
                          </p>
                          <div className="space-y-1 text-white">
                            {message.email && (
                              <a href={`mailto:${message.email}`} className="flex items-center text-white hover:text-white/80">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {message.email}
                              </a>
                            )}
                            {message.phone && (
                              <a href={`tel:${message.phone}`} className="flex items-center text-white hover:text-white/80">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {message.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center mb-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-l-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!user}
            />
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-r-lg font-medium transition"
              disabled={!newMessage.trim() || !user}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
          
          {/* Enhanced buttons with better styling */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={handleAlertSubmit}
              className="flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-lg font-medium transition shadow-sm"
              disabled={!newMessage.trim() || !user}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Send as Alert
            </button>
            <button
              type="button"
              onClick={handleEmergencyAlert}
              className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition shadow-sm"
              disabled={!user}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Emergency Alert
            </button>
          </div>
          
          {/* Location sharing and help buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={shareLocation}
              className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Share My Location
            </button>
            <button
              type="button"
              className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium transition shadow-sm"
              onClick={() => {
                // This could open a help modal or dropdown
                alert("Help resources will be shown here");
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help Resources
            </button>
          </div>
          
          {/* Message expiry notice */}
          <div className="mt-3 text-xs text-center text-gray-500">
            Messages will disappear after 24 hours for privacy
          </div>
          
          {/* Emergency Templates Dropdown - Improved styling */}
          <div className="mt-3">
            <select 
              className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onChange={(e) => {
                if (e.target.value) {
                  setNewMessage(e.target.value);
                }
              }}
              value=""
            >
              <option value="">-- Select Emergency Message Template --</option>
              <option value="EMERGENCY ALERT! I need immediate assistance at my current location!">Need Immediate Help</option>
              <option value="EMERGENCY! Medical assistance required urgently!">Medical Emergency</option>
              <option value="ALERT! I'm being followed/stalked. Need assistance.">Being Followed</option>
              <option value="EMERGENCY! I'm in an unsafe situation and need help.">Unsafe Situation</option>
              <option value="ALERT! I'm stranded and need help. My phone battery is low.">Stranded/Battery Low</option>
            </select>
          </div>
        </form>
      </div>
      
      {/* Safety guidelines - Enhanced card */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-5 rounded-xl shadow-md border border-blue-100">
        <h3 className="font-semibold text-lg mb-3 text-purple-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Safety Chat Guidelines
        </h3>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start bg-white p-3 rounded-lg shadow-sm">
            <div className="bg-amber-100 p-2 rounded-full mr-3 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Use the 'Alert' option for safety concerns</p>
              <p className="text-sm text-gray-600">When you need to notify others about a potential issue</p>
            </div>
          </li>
          <li className="flex items-start bg-white p-3 rounded-lg shadow-sm">
            <div className="bg-red-100 p-2 rounded-full mr-3 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Use 'Emergency Alert' for immediate assistance</p>
              <p className="text-sm text-gray-600">This will highlight your message and share your location</p>
            </div>
          </li>
          <li className="flex items-start bg-white p-3 rounded-lg shadow-sm">
            <div className="bg-blue-100 p-2 rounded-full mr-3 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Share your location when needed</p>
              <p className="text-sm text-gray-600">Your location can be shared via map, SMS, or WhatsApp</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default CommunityAlert;