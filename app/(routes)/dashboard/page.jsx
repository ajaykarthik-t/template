"use client";
import React, { useState, useEffect } from "react";

function Dashboard() {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);

  // Get and watch user location
  useEffect(() => {
    // Start continuous location tracking when component mounts
    if (navigator.geolocation) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toLocaleTimeString()
          };
          
          setLocation(newLocation);
          setLocationHistory(prev => [...prev, newLocation]);
          setLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError(error.message);
          setLoading(false);
        },
        { enableHighAccuracy: true }
      );
      
      // Set up continuous location watching
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toLocaleTimeString()
          };
          
          setLocation(newLocation);
          // Only add to history if moved more than 10 meters
          if (locationHistory.length === 0 || 
              calculateDistance(
                locationHistory[locationHistory.length-1].latitude,
                locationHistory[locationHistory.length-1].longitude,
                newLocation.latitude,
                newLocation.longitude
              ) > 10) {
            setLocationHistory(prev => [...prev.slice(-9), newLocation]);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error watching location:", error);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      
      setWatchId(id);
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      setLoading(false);
    }
    
    // Clean up the watch when component unmounts
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Calculate distance between two points in meters (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const handleSOSClick = () => {
    // Start emergency call to number 100
    window.location.href = "tel:100";
  };

  // Function to render the location information
  const renderLocationInfo = () => {
    if (loading) {
      return (
        <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Locating you...</p>
          </div>
        </div>
      );
    }

    if (locationError) {
      return (
        <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-red-500 text-center p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-bold mb-2">Unable to get your location</p>
            <p className="text-sm">{locationError}</p>
            <p className="mt-4 text-sm">
              Please enable location access in your browser settings. This is essential for emergency services to find you.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Location visualization */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="relative w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <div className="absolute w-12 h-12 bg-blue-400 rounded-full animate-ping opacity-30"></div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium">Live Location</h4>
              <p className="text-sm text-gray-600">Last updated: {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="ml-auto bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Active</div>
          </div>
        </div>
        
        {/* Coordinates */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Latitude</p>
              <p className="font-medium">{location?.latitude.toFixed(6)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Longitude</p>
              <p className="font-medium">{location?.longitude.toFixed(6)}</p>
            </div>
          </div>
          
          <div className="flex justify-between mb-1 items-center">
            <p className="text-xs text-gray-500">GPS Accuracy</p>
            <p className="text-xs font-medium text-gray-700">±{Math.round(location?.accuracy || 0)}m</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className={`h-2 rounded-full ${location?.accuracy < 20 ? 'bg-green-500' : location?.accuracy < 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.max(5, Math.min(100, 100 - (location?.accuracy / 100 * 100)))}%` }}
            ></div>
          </div>
          
          {/* Link to open in maps */}
          <div className="mt-4">
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${location?.latitude},${location?.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 flex items-center justify-center w-full py-2 border border-blue-600 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Google Maps
            </a>
          </div>
        </div>
        
        {/* Location history - last 5 points */}
        {locationHistory.length > 1 && (
          <div className="p-4 border-t border-gray-200">
            <h4 className="text-sm font-medium mb-2">Location History</h4>
            <div className="max-h-32 overflow-y-auto">
              {locationHistory.slice().reverse().map((loc, index) => (
                <div key={index} className="flex items-center text-xs mb-1 pb-1 border-b border-gray-100">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-gray-500 w-16">{loc.timestamp}</span>
                  <span className="truncate">
                    {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-10">      
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-2xl md:text-3xl">Women Safety App</h2>
        <div className="flex items-center">
          <span className={`h-3 w-3 rounded-full mr-2 ${locationError ? 'bg-red-500' : location ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
          <span className="text-sm font-medium">
            {locationError ? 'Offline' : location ? 'Live Tracking' : 'Connecting...'}
          </span>
        </div>
      </div>
      
      {/* Location Info */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg md:text-xl">Your Current Location</h3>
          {location && !locationError && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Updated: {new Date().toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {renderLocationInfo()}
        
        {!locationError && location && (
          <div className="mt-2 text-xs text-gray-600">
            <p>
              Your location updates automatically for emergency services to find you quickly
            </p>
          </div>
        )}
      </div>

      {/* SOS Button */}
      <div className="flex flex-col items-center">
        <button
          onClick={handleSOSClick}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-full text-xl shadow-lg animate-pulse w-full max-w-xs"
          aria-label="Emergency SOS button - calls emergency services at 100"
        >
          SOS EMERGENCY
        </button>
        <p className="mt-4 text-gray-600 text-center">
          Press the SOS button to immediately call emergency services (100)
        </p>
      </div>
      
      {/* Quick contacts - additional feature for women's safety app */}
      <div className="mt-10">
        <h3 className="font-semibold text-lg mb-4">Quick Emergency Contacts</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Family
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Friends
          </button>
        </div>
      </div>
      
      {/* Safety tips */}
      <div className="mt-10 bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">Safety Tips</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Stay in well-lit, populated areas when traveling alone at night
          </li>
          <li className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Share your trip details with a trusted person
          </li>
          <li className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Keep your phone charged and easily accessible
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;