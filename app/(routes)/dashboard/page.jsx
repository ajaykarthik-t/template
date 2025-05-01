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
      <h2 className="font-bold text-2xl mb-4"> Location Tracker</h2>
    </div>
  );
}

export default Dashboard;