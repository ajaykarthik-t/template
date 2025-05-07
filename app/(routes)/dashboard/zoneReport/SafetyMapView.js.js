"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from "@clerk/clerk-react";
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import Script from 'next/script';

function SafetyMapView() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [reportedZones, setReportedZones] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('unsafe');
  const [feedback, setFeedback] = useState('');
  
  // Map refs
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const drawingManagerRef = useRef(null);
  const shapesRef = useRef([]);
  
  // Get user info
  const userName = user?.fullName || "Anonymous User";
  const userId = user?.id || "anonymous";
  
  // Zone categories with colors
  const zoneCategories = {
    unsafe: {
      name: "Unsafe Area",
      color: "#ff0000",
      fillColor: "#ff000060"
    },
    suspicious: {
      name: "Suspicious Activity",
      color: "#ff9900",
      fillColor: "#ff990060"
    },
    hazard: {
      name: "Hazard",
      color: "#ffff00",
      fillColor: "#ffff0060"
    },
    help: {
      name: "Help Needed",
      color: "#0000ff",
      fillColor: "#0000ff60"
    }
  };
  
  // Check Firebase connection
  useEffect(() => {
    console.log("Checking Firebase connection...");
    try {
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
  
  // Load reported zones from Firebase
  useEffect(() => {
    if (!firebaseConnected) return;
    
    try {
      const zonesRef = collection(db, "safetyZones");
      
      // Listen for real-time updates
      const unsubscribe = onSnapshot(
        zonesRef,
        (snapshot) => {
          const zones = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert timestamps to JavaScript Date objects
            timestamp: doc.data().timestamp?.toDate?.() || new Date()
          }));
          
          setReportedZones(zones);
          setLoading(false);
        },
        (error) => {
          console.error("Error loading safety zones:", error);
          setFeedback("Error loading safety zones. Please try again.");
          setLoading(false);
        }
      );
      
      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up zones listener:", error);
      setLoading(false);
    }
  }, [firebaseConnected]);
  
  // Initialize Google Maps
  const initializeMap = () => {
    if (!mapRef.current || googleMapRef.current) return;

    // Try to get user's location first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          createMap({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to a central location if we can't get the user's location
          createMap({ lat: 39.8283, lng: -98.5795 });
        }
      );
    } else {
      // Default location if geolocation not available
      createMap({ lat: 39.8283, lng: -98.5795 });
    }
  };
  
  // Create the Google Map
  const createMap = (center) => {
    try {
      // Create the map
      const googleMap = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });
      
      // Save reference to map
      googleMapRef.current = googleMap;
      
      // Create drawing manager
      const drawingManager = new window.google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
          position: window.google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [
            window.google.maps.drawing.OverlayType.CIRCLE,
            window.google.maps.drawing.OverlayType.POLYGON,
            window.google.maps.drawing.OverlayType.RECTANGLE
          ],
        },
        circleOptions: {
          fillColor: zoneCategories.unsafe.fillColor,
          strokeColor: zoneCategories.unsafe.color,
          fillOpacity: 0.5,
          strokeWeight: 2,
          editable: true,
          draggable: true,
        },
        polygonOptions: {
          fillColor: zoneCategories.unsafe.fillColor,
          strokeColor: zoneCategories.unsafe.color,
          fillOpacity: 0.5,
          strokeWeight: 2,
          editable: true,
          draggable: true,
        },
        rectangleOptions: {
          fillColor: zoneCategories.unsafe.fillColor,
          strokeColor: zoneCategories.unsafe.color,
          fillOpacity: 0.5,
          strokeWeight: 2,
          editable: true,
          draggable: true,
        },
      });
      
      // Add drawing manager to map
      drawingManager.setMap(googleMap);
      drawingManagerRef.current = drawingManager;
      
      // Create user position marker
      const userMarker = new window.google.maps.Marker({
        position: center,
        map: googleMap,
        title: "Your Location",
        animation: window.google.maps.Animation.DROP,
      });
      
      // Add user marker info window
      const userInfoWindow = new window.google.maps.InfoWindow({
        content: "<strong>Your Location</strong><p>You are here</p>"
      });
      
      userMarker.addListener("click", () => {
        userInfoWindow.open(googleMap, userMarker);
      });
      
      // Handle completed drawings
      window.google.maps.event.addListener(drawingManager, 'overlaycomplete', (event) => {
        // Switch back to hand tool after drawing
        drawingManager.setDrawingMode(null);
        
        const newShape = event.overlay;
        const shapeType = event.type;
        
        // Store shape data
        let shapeData;
        
        if (shapeType === window.google.maps.drawing.OverlayType.CIRCLE) {
          const center = newShape.getCenter();
          const radius = newShape.getRadius();
          
          shapeData = {
            type: 'circle',
            center: { lat: center.lat(), lng: center.lng() },
            radius: radius
          };
        } 
        else if (shapeType === window.google.maps.drawing.OverlayType.POLYGON) {
          const path = newShape.getPath();
          const coordinates = [];
          
          for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            coordinates.push({ lat: point.lat(), lng: point.lng() });
          }
          
          shapeData = {
            type: 'polygon',
            coordinates: coordinates
          };
        }
        else if (shapeType === window.google.maps.drawing.OverlayType.RECTANGLE) {
          const bounds = newShape.getBounds();
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          
          shapeData = {
            type: 'rectangle',
            bounds: {
              north: ne.lat(),
              east: ne.lng(),
              south: sw.lat(),
              west: sw.lng()
            }
          };
        }
        
        // Show confirmation dialog
        if (shapeData) {
          showReportConfirmation(shapeData, newShape);
        }
      });
      
      // Display existing zones
      displayReportedZones();
      
    } catch (error) {
      console.error("Error creating map:", error);
      setFeedback("Error creating map. Please try again.");
    }
  };
  
  // Display all reported zones on the map
  const displayReportedZones = () => {
    if (!googleMapRef.current || !reportedZones.length) return;
    
    // Clear existing shapes
    shapesRef.current.forEach(shape => {
      shape.setMap(null);
    });
    shapesRef.current = [];
    
    // Add reported zones to map
    reportedZones.forEach(zone => {
      const zoneStyle = zoneCategories[zone.category] || zoneCategories.unsafe;
      let shape;
      
      if (zone.type === 'circle' && zone.center && zone.radius) {
        shape = new window.google.maps.Circle({
          center: { lat: zone.center.lat, lng: zone.center.lng },
          radius: zone.radius,
          map: googleMapRef.current,
          fillColor: zoneStyle.fillColor,
          strokeColor: zoneStyle.color,
          fillOpacity: 0.5,
          strokeWeight: 2,
          editable: false,
          draggable: false,
        });
      } 
      else if (zone.type === 'polygon' && zone.coordinates && zone.coordinates.length) {
        shape = new window.google.maps.Polygon({
          paths: zone.coordinates.map(coord => ({ lat: coord.lat, lng: coord.lng })),
          map: googleMapRef.current,
          fillColor: zoneStyle.fillColor,
          strokeColor: zoneStyle.color,
          fillOpacity: 0.5,
          strokeWeight: 2,
          editable: false,
          draggable: false,
        });
      }
      else if (zone.type === 'rectangle' && zone.bounds) {
        shape = new window.google.maps.Rectangle({
          bounds: {
            north: zone.bounds.north,
            east: zone.bounds.east,
            south: zone.bounds.south,
            west: zone.bounds.west
          },
          map: googleMapRef.current,
          fillColor: zoneStyle.fillColor,
          strokeColor: zoneStyle.color,
          fillOpacity: 0.5,
          strokeWeight: 2,
          editable: false,
          draggable: false,
        });
      }
      
      if (shape) {
        // Add info window with zone details
        const infoContent = `
          <div>
            <strong>${zoneStyle.name}</strong>
            <p>Reported by: ${zone.userName || 'Anonymous'}</p>
            <p>Reported: ${zone.timestamp?.toLocaleString() || 'Unknown'}</p>
          </div>
        `;
        
        const infoWindow = new window.google.maps.InfoWindow({
          content: infoContent
        });
        
        window.google.maps.event.addListener(shape, 'click', function() {
          infoWindow.setPosition(this.getCenter ? this.getCenter() : this.getBounds().getCenter());
          infoWindow.open(googleMapRef.current);
        });
        
        shapesRef.current.push(shape);
      }
    });
  };
  
  // Update zone display when zones change
  useEffect(() => {
    if (googleMapRef.current) {
      displayReportedZones();
    }
  }, [reportedZones]);
  
  // Show confirmation modal for reporting
  const showReportConfirmation = (shapeData, drawnShape) => {
    // Create and style the modal
    const modalContainer = document.createElement('div');
    modalContainer.style.position = 'fixed';
    modalContainer.style.top = '0';
    modalContainer.style.left = '0';
    modalContainer.style.width = '100%';
    modalContainer.style.height = '100%';
    modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalContainer.style.display = 'flex';
    modalContainer.style.justifyContent = 'center';
    modalContainer.style.alignItems = 'center';
    modalContainer.style.zIndex = '1000';
    
    const modal = document.createElement('div');
    modal.style.backgroundColor = 'white';
    modal.style.padding = '20px';
    modal.style.borderRadius = '8px';
    modal.style.width = '90%';
    modal.style.maxWidth = '400px';
    modal.style.maxHeight = '90vh';
    modal.style.overflow = 'auto';
    
    // Add content to modal
    modal.innerHTML = `
      <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">Report Safety Zone</h3>
      <p style="margin-bottom: 15px;">What type of zone are you reporting?</p>
      <div id="category-selection" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
        ${Object.entries(zoneCategories).map(([key, category]) => `
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="radio" name="category" value="${key}" ${key === selectedCategory ? 'checked' : ''} style="margin-right: 8px;">
            <span style="display: inline-block; width: 15px; height: 15px; background-color: ${category.color}; margin-right: 8px; border-radius: 50%;"></span>
            ${category.name}
          </label>
        `).join('')}
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button id="cancel-report" style="padding: 8px 16px; border: 1px solid #ccc; background-color: #f5f5f5; border-radius: 4px;">Cancel</button>
        <button id="confirm-report" style="padding: 8px 16px; border: none; background-color: #d32f2f; color: white; border-radius: 4px;">Report</button>
      </div>
    `;
    
    modalContainer.appendChild(modal);
    document.body.appendChild(modalContainer);
    
    // Handle cancel button
    document.getElementById('cancel-report').addEventListener('click', () => {
      // Remove the shape from the map
      drawnShape.setMap(null);
      document.body.removeChild(modalContainer);
    });
    
    // Handle confirm button
    document.getElementById('confirm-report').addEventListener('click', () => {
      // Get selected category
      const selectedCat = document.querySelector('input[name="category"]:checked').value;
      
      // Remove the temporary shape
      drawnShape.setMap(null);
      
      // Report the zone
      reportZone(shapeData, selectedCat);
      
      // Close the modal
      document.body.removeChild(modalContainer);
    });
  };
  
  // Submit zone report to Firebase
  const reportZone = async (zoneData, category) => {
    if (!userId || userId === "anonymous") {
      setFeedback("Please log in to report zones");
      return;
    }
    
    try {
      setFeedback("Submitting report...");
      
      // Create zone document
      const zoneDoc = {
        userId: userId,
        userName: userName,
        category: category,
        timestamp: serverTimestamp(),
        type: zoneData.type,
        // Store the actual zone data based on type
        ...(zoneData.type === 'circle' 
          ? { 
              center: zoneData.center,
              radius: zoneData.radius 
            } 
          : zoneData.type === 'polygon'
            ? { coordinates: zoneData.coordinates }
            : { bounds: zoneData.bounds }
        ),
        active: true // For future use if we want to expire zones
      };
      
      // Add to Firestore
      await addDoc(collection(db, "safetyZones"), zoneDoc);
      
      setFeedback("Zone reported successfully!");
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setFeedback("");
      }, 3000);
    } catch (error) {
      console.error("Error reporting zone:", error);
      setFeedback("Error reporting zone. Please try again.");
    }
  };
  
  // Handle reload button click
  const handleReload = () => {
    if (navigator.geolocation && googleMapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          googleMapRef.current.setCenter({ lat: latitude, lng: longitude });
          googleMapRef.current.setZoom(15);
        },
        (error) => {
          console.error("Error getting location:", error);
          setFeedback("Could not get your location. Please allow location access.");
        }
      );
    }
  };
  
  return (
    <>
      {/* Load Google Maps API */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=drawing,places`}
        onLoad={initializeMap}
        strategy="afterInteractive"
      />
      
      <div className="p-4 max-w-4xl mx-auto h-screen flex flex-col">
        <div className="flex items-center justify-between mb-4 bg-red-600 p-3 rounded-lg text-white">
          <h2 className="font-bold text-xl">Safety Map</h2>
          <div>
            <button 
              onClick={handleReload}
              className="bg-white text-red-600 px-3 py-1 rounded flex items-center text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              My Location
            </button>
          </div>
        </div>
        
        {/* Map info panel */}
        <div className="bg-white rounded-lg shadow-md p-3 mb-4 text-sm">
          <p className="mb-2">
            <strong>How to report a zone:</strong> Use the drawing tools on the map to mark areas of concern.
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(zoneCategories).map(([key, category]) => (
              <div key={key} className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: category.color }}></span>
                <span>{category.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Feedback message */}
        {feedback && (
          <div className="bg-blue-100 text-blue-800 p-3 rounded-lg mb-4 text-center">
            {feedback}
          </div>
        )}
        
        {/* Map container */}
        <div className="flex-1 relative rounded-lg overflow-hidden border border-gray-300 shadow-md">
          {loading ? (
            <div className="absolute inset-0 flex justify-center items-center bg-gray-100">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
          ) : (
            <div 
              ref={mapRef} 
              className="w-full h-full" 
              id="map"
            ></div>
          )}
        </div>
        
        {/* Help text at bottom */}
        <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-base mb-2">Map Guidelines</h3>
          <ul className="text-xs text-gray-700 space-y-1">
            <li className="flex items-start">
              <span className="text-amber-500 mr-1">•</span>
              Use the drawing tools to mark areas on the map
            </li>
            <li className="flex items-start">
              <span className="text-amber-500 mr-1">•</span>
              Circle: For specific locations with a radius
            </li>
            <li className="flex items-start">
              <span className="text-amber-500 mr-1">•</span>
              Rectangle/Polygon: For marking specific areas or streets
            </li>
            <li className="flex items-start">
              <span className="text-amber-500 mr-1">•</span>
              Click on marked zones to see details about the report
            </li>
            <li className="flex items-start">
              <span className="text-amber-500 mr-1">•</span>
              Reported zones are visible to all users in the community
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

export default SafetyMapView;