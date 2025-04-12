import { useState, useEffect, useRef } from "react";
import Accordion from "./accordion";
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
  { name: "Ein-Kerem", lat: 31.76447466383605, lon: 35.14723853129529 },
  { name: "Ichilov", lat: 32.07987031772444, lon: 34.789583962071234 },
  { name: "Rambam", lat: 32.83544415349387, lon: 34.98589504575949},
  { name: "Kaplan", lat: 31.87255050681198, lon: 34.811541692844486},
  { name: "Beilinson", lat: 32.086786809182804, lon: 34.86508687629207},

];


export default function App() {
  const [location, setLocation] = useState(null);
  const [speed, setSpeed] = useState(120); // knots
  const [delay, setDelay] = useState(1); // delay in minutes
  const [hospitalsArray, setHospitalsArray] = useState([]); // delay in minutes
  const [loadingMap, setloadingMap] = useState(true); // delay in minutes



  const [lastUpdated, setLastUpdated] = useState(null);
  const [, forceUpdate] = useState(0);

  const locationMarkerRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const linesRef = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((n) => n + 1); // triggers re-render
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(()=>{
    setHospitalsArray(renderHospitals())
  }, [location]);

  useEffect(() => {
    const getLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lon: longitude });
          setLastUpdated(Date.now()); // <-- Add this line

        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    };

    getLocation();
    const interval = setInterval(getLocation, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      !window.google?.maps?.Map ||
      !window.google?.maps?.marker?.AdvancedMarkerElement
    ) {
      console.warn("Google Maps still loading...");
      setloadingMap(true)

      return;
    }
    setloadingMap(false)
    if (
      location &&
      window.google &&
      window.google.maps &&
      mapRef.current &&
      mapRef.current instanceof HTMLElement
    ) 
    {
      if (!window.google.maps.Map) {
        console.warn("Map is not yet ready.");
        return;
      }
      // Initialize the map once
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: location.lat, lng: location.lon },
          zoom: 10,
          mapTypeId: 'satellite', // 👈 ADD THIS LINE
          mapId: '5036d76f53ca6c6a'
        });
  
        // Add hospital markers (only once)
        hospitals.forEach((h) => {
          // Create a custom label div
          const labelDiv = document.createElement('div');
          labelDiv.innerText = h.name;
          labelDiv.style.padding = '4px 6px';
          labelDiv.style.backgroundColor = '#fff';
          labelDiv.style.border = '1px solid #000';
          labelDiv.style.borderRadius = '6px';
          labelDiv.style.fontWeight = 'bold';
          labelDiv.style.fontSize = '14px';
          labelDiv.style.color = 'black';
          labelDiv.style.whiteSpace = 'nowrap';
          labelDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        
          const marker = new window.google.maps.marker.AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: { lat: h.lat, lng: h.lon },
            title: h.name,
            content: labelDiv,
          });
        
          markersRef.current.push(marker);
        });
        
      }
  
      // Remove old lines if needed
      linesRef.current.forEach((line) => line.setMap(null));
      linesRef.current = [];
  
      // Add polyline to each hospital
      hospitals.forEach((h) => {
        const line = new window.google.maps.Polyline({
          path: [
            { lat: location.lat, lng: location.lon },
            { lat: h.lat, lng: h.lon },
          ],
          geodesic: true,
          strokeColor: "#00C853",
          strokeOpacity: 1.0,
          strokeWeight: 2,
          map: mapInstanceRef.current,
        });
        linesRef.current.push(line);
      });
  
      // Update the current location marker
      if (!locationMarkerRef.current) {
        const markerDiv = document.createElement('div');
        markerDiv.style.width = '12px';
        markerDiv.style.height = '12px';
        markerDiv.style.borderRadius = '50%';
        markerDiv.style.backgroundColor = '#4285F4';
        markerDiv.style.border = '2px solid #ffffff';
        markerDiv.style.boxShadow = '0 0 4px rgba(0, 0, 0, 0.3)';
      
        locationMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
          map: mapInstanceRef.current,
          title: "Your Location",
          content: markerDiv,
        });
      }
    
      // Just update the marker’s position
      locationMarkerRef.current.position=
      {
        lat: location.lat,
        lng: location.lon,
      };
      
    }
    
  }, [location]);
  
  
  

  function renderHospitals () {
    if (!location) return <p>Fetching current location...</p>;

    let hospitalArray=[]
    hospitals.map((h, i) => {
      const distance = getDistanceNM(location.lat, location.lon, h.lat, h.lon);
      const etaMin = (distance / speed) * 60 +delay;
      const minutes = Math.floor(etaMin);
      const seconds = Math.round((etaMin - minutes) * 60);
      const thisRow = {
        hospital: h.name,
        distance: distance,
        eta: 'ETA: '+  minutes+ ' min. '+ seconds +' sec.'
      }
      hospitalArray.push(thisRow)
     
    });

    return hospitalArray.sort((a,b)=>a.distance-b.distance);
  };

  const getSecondsAgo = () => {
    if (!lastUpdated) return "";
    const seconds = Math.floor((Date.now() - lastUpdated) / 1000);
    return `Last updated: ${seconds} sec ago`;
  };

  
  return (
    <div >
      <h1 className="title-main-app">Time to Hospital</h1>

      <Accordion title="Calc Settings">
        <div className="settings">
          <label>
            Speed (knots):
            <input
              type="number"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value) || 0)}

            />
          </label>
          <label >
            Extra Time (min):
            <input
              type="number"
              value={delay}
              onChange={(e) => setDelay(parseFloat(e.target.value) || 0)}
            />
          </label>
        </div>
      </Accordion>


      <div className="last-update">
        <p>{getSecondsAgo()}</p>
      </div>

      {hospitalsArray?.length>0 && (
        <ul className="hospital-list">
          {hospitalsArray.map((h, index) => (
            <li key={index}>
              <p className="hospital-name">{h.hospital}</p>
              <p className="eta">{h.eta}</p>
              <p className="distance">{h.distance.toFixed(2)} NM</p>

            </li>
          ))}
        </ul>
      )}

      {loadingMap&&<h2>Loading map..</h2>}
      <div className="map-hospitals">
        <div ref={mapRef} className="google-map" />
      </div>
    </div>
  );
}


//npm run deploy
