"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from "@clerk/clerk-react";
import Link from 'next/link';

export default function SimpleSafetyMap() {
  const { user } = useUser();
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportedZones, setReportedZones] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('unsafe');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Get user info
  const userName = user?.fullName || "Anonymous User";
  
  // Zone categories with colors
  const zoneCategories = {
    unsafe: { name: "Unsafe Area", color: "#FF0000" },
    suspicious: { name: "Suspicious Activity", color: "#FF9900" },
    hazard: { name: "Hazard", color: "#FFFF00" },
    help: { name: "Help Needed", color: "#0000FF" }
  };
  
  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toLocaleTimeString()
          };
          
          setLocation(newLocation);
          setLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError(error.message);
          setLoading(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser");
      setLoading(false);
    }
  }, []);
  
  // For demo/prototyping purposes, we'll use local storage
  // instead of Firebase to store reported zones
  useEffect(() => {
    // Load saved reports from localStorage
    try {
      const savedReports = localStorage.getItem('safetyReports');
      if (savedReports) {
        setReportedZones(JSON.parse(savedReports));
      }
    } catch (error) {
      console.error("Error loading saved reports:", error);
    }
  }, []);
  
  // Save reports to localStorage whenever they change
  useEffect(() => {
    if (reportedZones.length > 0) {
      localStorage.setItem('safetyReports', JSON.stringify(reportedZones));
    }
  }, [reportedZones]);
  
  // Submit report locally (no Firebase dependency)
  const submitReport = async (e) => {
    e.preventDefault();
    
    if (!location) return;
    
    try {
      setSubmitting(true);
      
      // Create new report
      const newReport = {
        id: Date.now().toString(),
        userName: userName,
        category: currentCategory,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString()
      };
      
      // Add to local state
      setReportedZones(prev => [newReport, ...prev]);
      
      // Show success message
      setReportSuccess(true);
      setSubmitting(false);
      
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportForm(false);
      }, 3000);
      
    } catch (error) {
      console.error("Error submitting report:", error);
      setSubmitting(false);
    }
  };
  
  // Function to render the map and location info
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
              Please enable location access in your browser settings. This is essential for reporting zones accurately.
            </p>
          </div>
        </div>
      );
    }

    // Create map URL with OpenStreetMap
    const mapUrl = location ? 
      `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.01}%2C${location.latitude - 0.01}%2C${location.longitude + 0.01}%2C${location.latitude + 0.01}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}` : '';
    
    // URL to open in full map view
    const osmUrl = location ?
      `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}` : '';

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Map embed using OpenStreetMap */}
        <div className="w-full h-96 relative">
          {location ? (
            <iframe
              title="Your location map"
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
              src={mapUrl}
            ></iframe>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <p className="text-gray-600">Map loading...</p>
            </div>
          )}
          
          {/* Location status overlay */}
          <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full shadow-md text-xs flex items-center">
            <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Location active
          </div>
          
          {/* Safety Reports Count */}
          {reportedZones.length > 0 && (
            <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full shadow-md text-xs">
              {reportedZones.length} Safety Alert{reportedZones.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        {/* Location details */}
        <div className="p-4 border-t border-gray-200">
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
          
          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <a 
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white text-center py-3 px-4 rounded-lg flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Full Map
            </a>
            <button 
              onClick={() => setShowReportForm(true)}
              className="bg-red-600 text-white py-3 px-4 rounded-lg flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Report Safety Concern
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render reporting form
  const renderReportForm = () => {
    if (!showReportForm) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h3 className="font-bold text-xl mb-4">Report Safety Concern</h3>
          
          {reportSuccess ? (
            <div className="bg-green-100 text-green-800 p-6 rounded-lg mb-4 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-bold text-lg">Report Submitted Successfully</p>
              <p className="text-sm mt-2">Thank you for helping keep the community safe.</p>
            </div>
          ) : (
            <form onSubmit={submitReport}>
              <div className="mb-6">
                <p className="mb-2 font-medium">
                  You're reporting a safety concern at:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p>Latitude: {location?.latitude.toFixed(6)}</p>
                  <p>Longitude: {location?.longitude.toFixed(6)}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Accuracy: ±{Math.round(location?.accuracy || 0)}m
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block font-medium mb-3">
                  What type of safety concern?
                </label>
                <div className="space-y-2">
                  {Object.entries(zoneCategories).map(([key, category]) => (
                    <label key={key} className={`flex items-center p-3 border rounded-lg cursor-pointer ${currentCategory === key ? 'bg-gray-50 border-gray-400' : ''}`}>
                      <input
                        type="radio"
                        name="category"
                        value={key}
                        checked={currentCategory === key}
                        onChange={() => setCurrentCategory(key)}
                        className="mr-3"
                      />
                      <span 
                        className="inline-block w-5 h-5 rounded-full mr-3" 
                        style={{ backgroundColor: category.color }}
                      ></span>
                      <span className="font-medium">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
                  onClick={() => setShowReportForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };
  
  // Render zone list
  const renderReportedZones = () => {
    if (reportedZones.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No safety concerns have been reported in your area</p>
          <button 
            onClick={() => setShowReportForm(true)}
            className="mt-4 text-red-600 font-medium hover:underline"
          >
            Report your first safety concern
          </button>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          {reportedZones.map((zone) => {
            const category = zoneCategories[zone.category] || zoneCategories.unsafe;
            return (
              <div key={zone.id} className="p-4 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <span 
                    className="inline-block w-4 h-4 rounded-full mr-3" 
                    style={{ backgroundColor: category.color }}
                  ></span>
                  <strong className="font-medium">{category.name}</strong>
                  <span className="text-xs text-gray-500 ml-auto">
                    {new Date(zone.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 text-sm">
                  <p className="text-gray-700">
                    Reported by: {zone.userName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Location: {zone.latitude.toFixed(6)}, {zone.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Component's main rendering
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-2xl md:text-3xl">
          Safety Map
        </h2>
        <div className="flex items-center">
          <span className={`h-3 w-3 rounded-full mr-2 ${locationError ? 'bg-red-500' : location ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
          <span className="text-sm font-medium">
            {locationError ? 'Offline' : location ? 'Location Active' : 'Connecting...'}
          </span>
        </div>
      </div>
      
      {/* Map Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-xl">Your Current Location</h3>
          {location && !locationError && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Updated: {new Date().toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {renderMap()}
        
        {!locationError && location && (
          <div className="mt-2 text-sm text-gray-600">
            <p>
              Your current location is shown on the map. Use "Report Safety Concern" to mark any unsafe areas.
            </p>
          </div>
        )}
      </div>
      
      {/* Reported Zones */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-xl">Safety Reports</h3>
          <button 
            onClick={() => setShowReportForm(true)}
            className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full hover:bg-red-200"
          >
            + New Report
          </button>
        </div>
        
        {renderReportedZones()}
      </div>
      
      {/* Report modal */}
      {renderReportForm()}
      
      {/* Safety Legend */}
      <div className="mb-8">
        <h3 className="font-semibold text-xl mb-4">Safety Alert Types</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(zoneCategories).map(([key, category]) => (
            <div key={key} className="bg-white rounded-lg shadow-sm p-3 border border-gray-100 flex items-center">
              <span 
                className="inline-block w-6 h-6 rounded-full mr-3"
                style={{ backgroundColor: category.color }}
              ></span>
              <span className="font-medium">{category.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Back link */}
      <div className="text-center">
        <Link href="/dashboard" className="text-blue-600 hover:underline inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}