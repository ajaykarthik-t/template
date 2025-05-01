"use client";
import React, { useState, useEffect, useRef } from "react";
import Script from "next/script";

function Dashboard() {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  
  // Function to initialize the Google Map
  const initializeMap = () => {
    if (!location) return;
    
    // Create map centered at the user's current location
    const mapOptions = {
      center: { lat: location.latitude, lng: location.longitude },
      zoom: 16,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    };
    
    const map = new window.google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;
    
    // Add marker for user's position
    const marker = new window.google.maps.Marker({
      position: { lat: location.latitude, lng: location.longitude },
      map: map,
      title: "Your location",
      animation: window.google.maps.Animation.DROP,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      }
    });
    markerRef.current = marker;
    
    // Add accuracy circle around the marker
    if (location.accuracy) {
      new window.google.maps.Circle({
        map: map,
        center: { lat: location.latitude, lng: location.longitude },
        radius: location.accuracy,
        strokeColor: "#4285F4",
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: "#4285F4",
        fillOpacity: 0.2
      });
    }
  };
  
  // Update map marker when location changes
  const updateMapPosition = () => {
    if (!mapInstanceRef.current || !markerRef.current || !location) return;
    
    const newPosition = { lat: location.latitude, lng: location.longitude };
    markerRef.current.setPosition(newPosition);
    mapInstanceRef.current.panTo(newPosition);
  };

  useEffect(() => {
    // Start continuous location tracking when component mounts
    if (navigator.geolocation) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
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
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLoading(false);
        },
        (error) => {
          console.error("Error watching location:", error);
          setLocationError(error.message);
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
  
  // Initialize map when location is first obtained or when Google Maps API is loaded
  useEffect(() => {
    if (location && window.google && window.google.maps) {
      if (!mapInstanceRef.current) {
        initializeMap();
      } else {
        updateMapPosition();
      }
    }
  }, [location]);

  const handleSOSClick = () => {
    // Start emergency call to number 100
    window.location.href = "tel:100";
  };

  // Function to render the map container
  const renderMap = () => {
    if (loading) {
      return (
        <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Locating you...</p>
          </div>
        </div>
      );
    }

    if (locationError) {
      return (
        <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
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
      <div className="relative">
        <div 
          ref={mapRef} 
          className="h-96 rounded-lg shadow-lg"
          aria-label="Map showing your current location"
        ></div>
        
        {location && (
          <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-md text-sm z-10">
            <p className="font-semibold text-gray-700">GPS Coordinates:</p>
            <p>Lat: {location.latitude.toFixed(6)}</p>
            <p>Lng: {location.longitude.toFixed(6)}</p>
            {location.accuracy && (
              <p className="text-xs text-gray-500 mt-1">
                Accuracy: ±{Math.round(location.accuracy)}m
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-10">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`}
        strategy="afterInteractive"
        onLoad={() => {
          if (location) {
            initializeMap();
          }
        }}
      />
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-2xl md:text-3xl">Women Safety App</h2>
        <div className="flex items-center">
          <span className={`h-3 w-3 rounded-full mr-2 ${locationError ? 'bg-red-500' : location ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
          <span className="text-sm font-medium">
            {locationError ? 'Offline' : location ? 'Live Tracking' : 'Connecting...'}
          </span>
        </div>
      </div>
      
      {/* Location Map */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg md:text-xl">Your Current Location</h3>
          {location && !locationError && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Updated: {new Date().toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {renderMap()}
        
        {!locationError && location && (
          <div className="mt-2 flex justify-between items-center text-xs text-gray-600">
            <p>
              Location updates automatically every few seconds
            </p>
            <p>
              {location.accuracy && `GPS Accuracy: ±${Math.round(location.accuracy)}m`}
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
          <button className="bg-purple-600 text-white p-3 rounded-lg flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Family
          </button>
          <button className="bg-blue-600 text-white p-3 rounded-lg flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Friends
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

