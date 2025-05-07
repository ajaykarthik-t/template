"use client";
import React, { useState, useEffect, useRef } from 'react';

// Zone types with their colors for visualization
const zoneTypes = {
  'unsafe': { color: '#ff0000', label: 'Unsafe Area' },
  'suspicious': { color: '#ff9900', label: 'Suspicious Activity' },
  'harassment': { color: '#9900cc', label: 'Harassment Reported' },
  'incident': { color: '#cc0000', label: 'Incident Occurred' },
  'safe': { color: '#00cc00', label: 'Safe Zone' }
};

function Zone() {
  const [zones, setZones] = useState([]);
  const [newZone, setNewZone] = useState({
    type: 'unsafe',
    description: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].slice(0, 5)
  });
  const [viewMode, setViewMode] = useState('map'); // 'map', 'list', or 'grid'
  const [stats, setStats] = useState({});
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const mapRef = useRef(null);
  
  // Calculate stats when zones change
  useEffect(() => {
    const calculateStats = () => {
      const typeCounts = {};
      
      Object.keys(zoneTypes).forEach(type => {
        typeCounts[type] = 0;
      });
      
      zones.forEach(zone => {
        typeCounts[zone.type] = (typeCounts[zone.type] || 0) + 1;
      });
      
      setStats({
        total: zones.length,
        typeCounts
      });
    };
    
    calculateStats();
  }, [zones]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewZone({
      ...newZone,
      [name]: value
    });
  };

  const handleMapClick = (e) => {
    if (!mapRef.current) return;
    
    // Get click coordinates relative to the map
    const rect = mapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to percentages (0-100)
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    setSelectedLocation({ xPercent, yPercent });
    setIsFormVisible(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedLocation && viewMode === 'map') {
      alert("Please click on the map to select a location first.");
      return;
    }
    
    const zoneToAdd = {
      id: Date.now(),
      ...newZone,
      createdAt: new Date().toISOString()
    };
    
    // If we have a selected location from the map
    if (selectedLocation) {
      zoneToAdd.xPercent = selectedLocation.xPercent;
      zoneToAdd.yPercent = selectedLocation.yPercent;
      // Simulate real coordinates for display
      zoneToAdd.lat = 12.9716 + (Math.random() * 0.1 - 0.05);
      zoneToAdd.lng = 77.5946 + (Math.random() * 0.1 - 0.05);
    } else {
      // For non-map submissions, use random position for visualization
      zoneToAdd.xPercent = Math.random() * 90 + 5; // 5-95%
      zoneToAdd.yPercent = Math.random() * 90 + 5; // 5-95%
      zoneToAdd.lat = 12.9716 + (Math.random() * 0.1 - 0.05);
      zoneToAdd.lng = 77.5946 + (Math.random() * 0.1 - 0.05);
    }
    
    setZones([...zones, zoneToAdd]);
    
    // Reset form
    setNewZone({
      type: 'unsafe',
      description: '',
      address: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].slice(0, 5)
    });
    setSelectedLocation(null);
    setIsFormVisible(false);
  };

  const handleDeleteZone = (id) => {
    setZones(zones.filter(zone => zone.id !== id));
  };

  const formatDateTime = (date, time) => {
    return `${date} ${time}`;
  };

  // Get approximate location based on coordinates
  const getApproximateLocation = (lat, lng) => {
    return `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-bold text-2xl md:text-3xl text-gray-800">Safety Zone Report</h1>
        <p className="text-gray-600 text-sm md:text-base mt-1">
          Report and view safety concerns in your area
        </p>
      </div>
      
      {/* Stats Display */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-lg mb-2">Zone Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-gray-100 p-3 rounded-lg text-center">
            <span className="text-2xl font-bold text-blue-600">{stats.total || 0}</span>
            <p className="text-xs text-gray-600">Total Reports</p>
          </div>
          
          {Object.entries(zoneTypes).map(([type, { label, color }]) => (
            <div key={type} className="bg-gray-100 p-3 rounded-lg text-center">
              <span className="text-2xl font-bold" style={{ color }}>
                {stats?.typeCounts?.[type] || 0}
              </span>
              <p className="text-xs text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* View Toggle */}
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 text-sm font-medium ${
              viewMode === 'map' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } rounded-l-lg`}
          >
            Map View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 text-sm font-medium ${
              viewMode === 'list' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 text-sm font-medium ${
              viewMode === 'grid' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } rounded-r-lg`}
          >
            Grid View
          </button>
        </div>
      </div>
      
      {/* Map View */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
          <div className="p-4 bg-blue-50 border-b">
            <h3 className="font-semibold">Click on the map to report a zone</h3>
            
            {/* Legend */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {Object.entries(zoneTypes).map(([type, { label, color }]) => (
                <div key={type} className="flex items-center">
                  <span 
                    className="w-3 h-3 inline-block mr-1 rounded-full" 
                    style={{ backgroundColor: color }}
                  ></span>
                  <span className="text-xs text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Simple Map Visualization */}
          <div className="relative h-96 w-full bg-gray-100 border-b" ref={mapRef} onClick={handleMapClick}>
            {/* Map Background - Could be replaced with an actual map image */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-70"
              style={{ 
                backgroundImage: "url('/api/placeholder/800/400')",
                backgroundSize: 'cover'
              }}
            ></div>
            
            {/* Grid lines for reference */}
            <div className="absolute inset-0">
              <div className="w-full h-full grid grid-cols-4 grid-rows-4">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="border border-gray-200 opacity-30"></div>
                ))}
              </div>
            </div>
            
            {/* Reported Zones */}
            {zones.map(zone => (
              <div 
                key={zone.id}
                className="absolute w-16 h-16 transform -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 flex items-center justify-center cursor-pointer"
                style={{ 
                  backgroundColor: zoneTypes[zone.type].color,
                  left: `${zone.xPercent}%`,
                  top: `${zone.yPercent}%`
                }}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent map click
                  alert(`${zoneTypes[zone.type].label}: ${zone.description}`);
                }}
              >
                <div className="bg-white rounded-full p-1 text-xs font-bold" style={{ color: zoneTypes[zone.type].color }}>
                  {zones.indexOf(zone) + 1}
                </div>
              </div>
            ))}
            
            {/* Selected Location Marker */}
            {selectedLocation && (
              <div 
                className="absolute w-8 h-8 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 border-2 border-white animate-ping"
                style={{ 
                  left: `${selectedLocation.xPercent}%`,
                  top: `${selectedLocation.yPercent}%`
                }}
              ></div>
            )}
          </div>
          
          {/* Form for adding a new zone when location is selected */}
          {isFormVisible && (
            <div className="p-4 border-t">
              <h3 className="font-semibold text-lg mb-2">Report a Zone</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zone Type
                  </label>
                  <select
                    name="type"
                    value={newZone.type}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  >
                    {Object.entries(zoneTypes).map(([type, { label }]) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={newZone.description}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows="3"
                    required
                    placeholder="Describe what happened or why this area should be reported..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address/Location Details
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={newZone.address}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Optional: Add specific location details"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={newZone.date}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      name="time"
                      value={newZone.time}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormVisible(false);
                      setSelectedLocation(null);
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {!isFormVisible && (
            <div className="p-4 border-t">
              <p className="text-center text-sm text-gray-600">
                Click on the map to report a new zone
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Non-Map Form */}
      {viewMode !== 'map' && (
        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
          <div className="p-4 bg-blue-50 border-b">
            <h3 className="font-semibold">Report a New Safety Zone</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone Type
                </label>
                <select
                  name="type"
                  value={newZone.type}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                >
                  {Object.entries(zoneTypes).map(([type, { label }]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location/Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={newZone.address}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Enter location or address"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={newZone.description}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows="3"
                  required
                  placeholder="Describe what happened or why this area should be reported..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={newZone.date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  name="time"
                  value={newZone.time}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
            
            <div className="mt-4">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Zone List/Grid View */}
      {(viewMode === 'list' || viewMode === 'grid') && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="font-semibold">Reported Safety Zones</h3>
            
            {zones.length > 0 && (
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(zones, null, 2);
                  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
                  
                  const exportFileDefaultName = `safety-zones-${new Date().toISOString().slice(0, 10)}.json`;
                  
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Export Data
              </button>
            )}
          </div>
          
          {zones.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No zones have been reported yet.</p>
              <p className="text-sm mt-2">Use the form above to report a new zone.</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="divide-y">
              {zones.map(zone => (
                <div key={zone.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-medium" style={{ color: zoneTypes[zone.type].color }}>
                        {zoneTypes[zone.type].label}
                      </h4>
                      <p className="text-sm my-1">{zone.description}</p>
                      <p className="text-xs text-gray-600">
                        Reported: {formatDateTime(zone.date, zone.time)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Location: {zone.address || getApproximateLocation(zone.lat, zone.lng)}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button 
                        onClick={() => {
                          setViewMode('map');
                          // In a real implementation, this would focus the map on this zone
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        View on Map
                      </button>
                      <button 
                        onClick={() => handleDeleteZone(zone.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete Report
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {zones.map(zone => (
                <div 
                  key={zone.id} 
                  className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  style={{ borderColor: zoneTypes[zone.type].color }}
                >
                  <div 
                    className="p-2 text-white text-sm font-medium"
                    style={{ backgroundColor: zoneTypes[zone.type].color }}
                  >
                    {zoneTypes[zone.type].label}
                  </div>
                  <div className="p-3">
                    <p className="text-sm mb-2">{zone.description}</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>When: {formatDateTime(zone.date, zone.time)}</p>
                      <p>Where: {zone.address || getApproximateLocation(zone.lat, zone.lng)}</p>
                    </div>
                    <div className="mt-3 flex justify-between">
                      <button 
                        onClick={() => {
                          setViewMode('map');
                          // In a real implementation, this would focus the map on this zone
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        View on Map
                      </button>
                      <button 
                        onClick={() => handleDeleteZone(zone.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Map Enhancement Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="font-semibold text-lg mb-2">Map Enhancement Note</h3>
        <p className="text-sm">
          This is using a simplified map visualization. For a more advanced interactive map, install:
        </p>
        <pre className="bg-gray-800 text-white p-3 rounded text-sm overflow-x-auto my-3">
          npm install leaflet react-leaflet
        </pre>
        <p className="text-sm">
          Then update the imports at the top of this file to use the actual map components.
        </p>
      </div>
    </div>
  );
}

export default Zone;