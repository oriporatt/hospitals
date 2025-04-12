import { useState, useEffect, useRef } from "react";
import './App.css';

function getDistanceNM(lat1, lon1, lat2, lon2) {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 3440.065; // nautical miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const hospitals = [
  { name: "Soroka", lat: 31.258281971116965, lon: 34.80028913558231 },
  { name: "Tel-Hashomer", lat: 32.043345439740804, lon: 34.84204683608886 },
];

export default function App() {
  const [location, setLocation] = useState(null);
  const [speed, setSpeed] = useState(130); // knots
  const mapRef = useRef(null);

  useEffect(() => {
    const getLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lon: longitude });
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    };

    getLocation();
    const interval = setInterval(getLocation, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      location &&
      window.google &&
      mapRef.current &&
      mapRef.current instanceof HTMLElement
    ) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: location.lat, lng: location.lon },
        zoom: 10,
      });
  
      // Current location marker
      new window.google.maps.Marker({
        position: { lat: location.lat, lng: location.lon },
        map,
        title: "Your Location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: "#ffffff",
        },
      });
  
      // Hospital markers and lines
      hospitals.forEach((h) => {
        // Hospital marker with "H"
      // Hospital marker with "H" label and name as tooltip
      new window.google.maps.Marker({
        position: { lat: h.lat, lng: h.lon },
        map,
        title: h.name, // shows as tooltip on hover
        label: {
          text: h.name,
          color: "black",
          fontWeight: "bold",
          fontSize: "14px",
        },
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // classic pin icon
        },
      });

  
        // Draw polyline from current location to hospital
        new window.google.maps.Polyline({
          path: [
            { lat: location.lat, lng: location.lon },
            { lat: h.lat, lng: h.lon },
          ],
          geodesic: true,
          strokeColor: "#00C853",
          strokeOpacity: 1.0,
          strokeWeight: 2,
          map,
        });
      });
    }
  }, [location]);
  
  

  const renderHospitals = () => {
    if (!location) return <p>Fetching current location...</p>;

    return hospitals.map((h, i) => {
      const distance = getDistanceNM(location.lat, location.lon, h.lat, h.lon);
      const etaMin = (distance / speed) * 60;
      const minutes = Math.floor(etaMin);
      const seconds = Math.round((etaMin - minutes) * 60);

      return (
        <div key={i} style={{ marginBottom: 10 }}>
          <h3>{h.name}</h3>
          <p>Distance: {distance.toFixed(2)} NM</p>
          <p>ETA: {minutes} min {seconds} sec</p>
        </div>
      );
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Flight Tracker</h1>
      <label>
        Speed (knots):
        <input
          type="number"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value) || 0)}
          style={{ marginLeft: 10 }}
        />
      </label>

      <div style={{ marginTop: 20 }}>{renderHospitals()}</div>

      <div style={{ height: 400, marginTop: 20 }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
