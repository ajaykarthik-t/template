"use client";
import React, { useState, useEffect } from "react";

function Dashboard() {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user's geolocation when component mounts
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
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
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      setLoading(false);
    }
  }, []);

  const handleSOSClick = () => {
    // Navigate to emergency call - this uses the tel: protocol to initiate a call
    window.location.href = "tel:100";
  };

  return (
    <div className="p-10">
      <h2 className="font-bold text-3xl mb-6">Emergency Dashboard</h2>
      
      {/* Location information */}
      <div className="mb-8 p-6 bg-gray-100 rounded-lg shadow">
        <h3 className="font-semibold text-xl mb-4">Your Current Location</h3>
        {loading ? (
          <p className="text-gray-600">Loading your location...</p>
        ) : locationError ? (
          <div className="text-red-500">
            <p>Unable to get your location: {locationError}</p>
            <p className="mt-2 text-sm">Please enable location access in your browser settings.</p>
          </div>
        ) : (
          <div>
            <p className="mb-2">
              <span className="font-medium">Latitude:</span> {location?.latitude.toFixed(6)}
            </p>
            <p className="mb-2">
              <span className="font-medium">Longitude:</span> {location?.longitude.toFixed(6)}
            </p>
            <p className="text-sm text-gray-600 mt-4">
              This location information can be shared with emergency services when needed.
            </p>
          </div>
        )}
      </div>

      {/* SOS Button */}
      <div className="text-center">
        <button
          onClick={handleSOSClick}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-full text-xl shadow-lg animate-pulse"
        >
          SOS EMERGENCY
        </button>
        <p className="mt-4 text-gray-600">
          Press the SOS button to immediately call emergency services (100)
        </p>
      </div>
    </div>
  );
}

export default Dashboard;