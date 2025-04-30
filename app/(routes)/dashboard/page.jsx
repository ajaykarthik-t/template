"use client";
import React, { useState, useEffect, useRef } from "react";

function Dashboard() {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [accuracy, setAccuracy] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [heading, setHeading] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [watchId, setWatchId] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const pathRef = useRef([]);
  const polylineRef = useRef(null);

  // Initialize the map
  useEffect(() => {
    // Add Leaflet CSS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/leaflet.css';
    document.head.appendChild(linkElement);

    // Add Leaflet JS
    const scriptElement = document.createElement('script');
    scriptElement.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/leaflet.js';
    document.head.appendChild(scriptElement);

    scriptElement.onload = () => {
      // Initialize the map once Leaflet is loaded
      if (mapRef.current && !mapInstanceRef.current && window.L) {
        try {
          // Create map instance
          mapInstanceRef.current = window.L.map(mapRef.current).setView([0, 0], 2);
          
          // Add tile layer (OpenStreetMap)
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(mapInstanceRef.current);
          
          // Add user panning detection
          mapInstanceRef.current.on('dragstart', () => {
            mapInstanceRef.current._userPannedRecently = true;
          });
          
          // Reset user panning flag after 10 seconds of no interaction
          mapInstanceRef.current.on('dragend', () => {
            setTimeout(() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current._userPannedRecently = false;
              }
            }, 10000);
          });
          
          setMapReady(true);
          
          // Start tracking user's location
          startTracking();
        } catch (e) {
          console.error("Error initializing map:", e);
          setError("Failed to initialize map. Please refresh the page.");
        }
      }
    };

    return () => {
      // Clean up
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Function to start tracking location
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    // Options for high accuracy GPS
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    // Watch position with high accuracy options
    const id = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      options
    );
    
    setWatchId(id);
  };

  // Handle position updates
  const handlePositionUpdate = (position) => {
    const newLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
    
    setLocation(newLocation);
    setAccuracy(position.coords.accuracy);
    
    if (position.coords.speed !== null) {
      setSpeed(position.coords.speed);
    }
    
    if (position.coords.heading !== null && !isNaN(position.coords.heading)) {
      setHeading(position.coords.heading);
    }
    
    setIsLoading(false);
    
    // Update map with new position
    updateMapPosition(newLocation, position.coords.accuracy, position.coords.heading);
  };

  // Handle position errors
  const handlePositionError = (err) => {
    setError(`Error: ${err.message}`);
    setIsLoading(false);
  };

  // Update map with new position
  const updateMapPosition = (newLocation, accuracy, heading) => {
    if (!mapInstanceRef.current || !window.L) return;
    
    const { latitude, longitude } = newLocation;
    
    // Create marker if it doesn't exist
    if (!markerRef.current) {
      // Custom icon with direction indicator
      const icon = window.L.divIcon({
        className: 'location-marker',
        html: `<div style="position: relative">
                <div style="width: 24px; height: 24px; background-color: #3b82f6; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3)"></div>
                ${heading !== null && !isNaN(heading) ? 
                  `<div style="position: absolute; top: -10px; left: 9px; width: 0; height: 0; border-left: 3px solid transparent; border-right: 3px solid transparent; border-bottom: 10px solid #1d4ed8; transform: rotate(${heading}deg); transform-origin: bottom center;"></div>` : ''}
              </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      markerRef.current = window.L.marker([latitude, longitude], { icon }).addTo(mapInstanceRef.current);
      
      // Create accuracy circle
      accuracyCircleRef.current = window.L.circle([latitude, longitude], {
        radius: accuracy,
        color: '#3b82f6',
        fillColor: '#93c5fd',
        fillOpacity: 0.15,
        weight: 1
      }).addTo(mapInstanceRef.current);
      
      // Create polyline for path
      polylineRef.current = window.L.polyline([], { 
        color: '#3b82f6', 
        weight: 3,
        opacity: 0.7
      }).addTo(mapInstanceRef.current);
      
      // Initial path point
      pathRef.current.push([latitude, longitude]);
      polylineRef.current.setLatLngs(pathRef.current);
      
      // Set view to user's location but from above (zoom level 15 instead of 17)
      mapInstanceRef.current.setView([latitude, longitude], 15);
    } else {
      // Update existing marker position
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      
        // Update direction indicator if heading is available
        if (heading !== null && !isNaN(heading)) {
          const icon = window.L.divIcon({
            className: 'location-marker',
            html: `<div style="position: relative">
                    <div style="width: 24px; height: 24px; background-color: #3b82f6; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3)"></div>
                    <div style="position: absolute; top: -10px; left: 9px; width: 0; height: 0; border-left: 3px solid transparent; border-right: 3px solid transparent; border-bottom: 10px solid #1d4ed8; transform: rotate(${heading}deg); transform-origin: bottom center;"></div>
                  </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          markerRef.current.setIcon(icon);
        }
      }
      
      // Update accuracy circle if it exists
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([latitude, longitude]);
        accuracyCircleRef.current.setRadius(accuracy);
      }
      
      // Update path
      pathRef.current.push([latitude, longitude]);
      
      // Limit path history to 100 points
      if (pathRef.current.length > 100) {
        pathRef.current = pathRef.current.slice(-100);
      }
      
      // Update polyline if it exists
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(pathRef.current);
      }
      
      // Pan map to keep marker in view (but don't auto-follow if user has manually moved the map)
      // We avoid constant panning which can be annoying for the user
      if (mapInstanceRef.current._userPannedRecently !== true) {
        mapInstanceRef.current.panTo([latitude, longitude]);
      }
    }
  };

  // Function to recenter the map on the user's current location
  const centerMapOnLocation = () => {
    if (mapInstanceRef.current && location.latitude && location.longitude) {
      mapInstanceRef.current.setView([location.latitude, location.longitude], 17);
    }
  };

  // Function to toggle tracking
  const toggleTracking = () => {
    if (watchId) {
      // Stop tracking
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    } else {
      // Start tracking
      startTracking();
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="font-bold text-2xl mb-4">Live Location Tracker</h2>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 relative">
        {/* Map container */}
        <div 
          ref={mapRef} 
          className="w-full h-96"
          style={{ height: '400px' }}
        ></div>
        
        {/* Loading overlay for map */}
        {!mapReady && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 mb-2 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Loading map...</p>
            </div>
          </div>
        )}
        
        {/* Controls overlay */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <button 
            onClick={centerMapOnLocation}
            className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
            title="Center on my location"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          <button 
            onClick={toggleTracking}
            className={`p-2 rounded-full shadow-md ${watchId ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
            title={watchId ? 'Stop tracking' : 'Start tracking'}
          >
            {watchId ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3l-6 6m0 0V4m0 5h5M5 21l6-6m0 0v5m0-5H5" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center justify-center py-4 text-gray-600">
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="4"
                fill="none"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Acquiring GPS signal...</span>
          </div>
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-600">
            <div className="font-medium">Location Error</div>
            <div className="text-sm">{error}</div>
            <div className="mt-2 text-xs">
              Please make sure location services are enabled and you've granted permission.
            </div>
          </div>
        </div>
      )}
      
      {/* Location info display */}
      {!isLoading && !error && location.latitude && location.longitude && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold mb-3">GPS Data</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500">Latitude</div>
              <div className="font-mono">{location.latitude.toFixed(6)}</div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500">Longitude</div>
              <div className="font-mono">{location.longitude.toFixed(6)}</div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500">Accuracy</div>
              <div className="font-mono">{accuracy ? `±${accuracy.toFixed(1)}m` : "N/A"}</div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500">Speed</div>
              <div className="font-mono">{speed ? `${(speed * 3.6).toFixed(1)} km/h` : "N/A"}</div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            {watchId 
              ? "GPS tracking active - location updates automatically" 
              : "GPS tracking paused - press the tracking button to resume"}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;