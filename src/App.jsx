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
  { name: "Soroka",superH:true,geoSep:'S', lat: 31.258281971116965, lon: 34.80028913558231},
  { name: "Tel-Hashomer",superH:true,geoSep:'C', lat: 32.043345439740804, lon: 34.84204683608886 },
  { name: "Ein-Kerem",superH:true,geoSep:'B', lat: 31.76447466383605, lon: 35.14723853129529 },
  { name: "Ichilov",superH:true,geoSep:'C', lat: 32.07987031772444, lon: 34.789583962071234 },
  { name: "Rambam",superH:true,geoSep:'N', lat: 32.83544415349387, lon: 34.98589504575949},
  { name: "Kaplan",superH:false,geoSep:'C', lat: 31.87255050681198, lon: 34.811541692844486},
  { name: "Beilinson",superH:true, geoSep:'C', lat: 32.086786809182804, lon: 34.86508687629207},
  { name: "Naharia",superH:false, geoSep:'N', lat: 33.01061747783171, lon: 35.11604851392026},
  { name: "Ziv",superH:false, geoSep:'N', lat:32.95139765043419, lon: 35.11604851392026},
  { name: "Emek",superH:false, geoSep:'N', lat: 32.61993274567445, lon: 35.31472510932093},
  { name: "Yoseftal",superH:false, geoSep:'S', lat: 29.553838905613258, lon: 34.94147079967984},
  { name: "Poria",superH:false, geoSep:'N', lat: 32.75405095314971, lon: 35.542539145154116},


];





export default function App() {
  const [location, setLocation] = useState(null);
  const [lastLocation, setLastLocation] = useState(null);

  const [speed, setSpeed] = useState(120); // knots
  const [delay, setDelay] = useState(1); // delay in minutes
  const [hospitalsArray, setHospitalsArray] = useState([]); 
  const [loadingMap, setloadingMap] = useState(true); 
  const [filterGeo, setFilterGeo] = useState('all'); 

  
  const [lastUpdated, setLastUpdated] = useState(null);
  const [, forceUpdate] = useState(0);

  const locationMarkerRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const linesRef = useRef([]);
  const inputRef = useRef(null);
  const [mode, setMode] = useState("gps");

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((n) => n + 1); // triggers re-render
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterAndSetHospitals(location, filterGeo);
  }, [location]);

  useEffect(() => {
    if (mode !== "gps") return; 
  
    const getLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lon: longitude });
          setLastLocation({ lat: latitude, lon: longitude });
          setLastUpdated(Date.now());
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    };
  
    getLocation();
    const interval = setInterval(getLocation, 10000);
    return () => clearInterval(interval);
  }, [mode]);


  useEffect(() => {
    if (!mapInstanceRef.current) return;
  
    const handleClick = (e) => {
      if (mode === "manual") {
        const lat = e.latLng.lat();
        const lon = e.latLng.lng();
        setLocation({ lat, lon });

        mapInstanceRef.current.setCenter({ lat, lng: lon });
        
      }
    };
  
    // Always attach the listener
    const listener = mapInstanceRef.current.addListener("click", handleClick);
  
    // Cleanup on unmount or mode change
    return () => {
      window.google.maps.event.removeListener(listener);
    };
  }, [mode]);



  

  useEffect(() => {
    if (!mapInstanceRef.current || !location) return;
    mapInstanceRef.current.panTo({ lat: location.lat, lng: location.lon });
  }, [location]);
  

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
          zoom: 8,
          mapTypeId: 'satellite', // 👈 ADD THIS LINE
          mapId: '5036d76f53ca6c6a'
        });

        if (inputRef.current) {
          const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current);
          autocomplete.bindTo("bounds", mapInstanceRef.current);
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat();
              const lon = place.geometry.location.lng();
              mapInstanceRef.current.panTo({ lat, lng: lon }); // ✅ smooth transition
              setLocation({ lat: lat, lon: lon });
              setLastUpdated(Date.now()); // ✅ Reset the timer

              
              if (mode==='gps'){
                setMode("manual")              
              }
            }
          });
        }



        
      }
      
  
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
  
  
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps?.marker?.AdvancedMarkerElement) return;

    // 1. Clear old markers from map
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  
    // 2. Add updated markers
    hospitalsArray.forEach((h) => {
      const labelDiv = document.createElement('div');
      labelDiv.innerText = h.hospital;
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
        title: h.hospital,
        content: labelDiv,
      });

      markersRef.current.push(marker);

      linesRef.current.forEach((line) => line.setMap(null));
      linesRef.current = [];
  
      // Add polyline to each hospital
      hospitalsArray.forEach((h) => {
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
  
      
    });
  }, [hospitalsArray]);
  

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
        eta: 'ETA: '+  minutes+ ' min. '+ seconds +' sec.',
        superH: h.superH,
        geoSep: h.geoSep,
        lat:h.lat,
        lon: h.lon 
      }
      hospitalArray.push(thisRow)
     
    });

    if (location && lastLocation && mode==='manual' ){
      const distance2 = getDistanceNM(location.lat, location.lon, lastLocation.lat, lastLocation.lon);
      const etaMin2 = (distance2 / speed) * 60 + delay;
      const minutes2 = Math.floor(etaMin2);
      const seconds2 = Math.round((etaMin2 - minutes2) * 60);
    
      const newRow= {
        hospital: "📍 Current Location",
        distance: distance2,
        eta: `ETA: ${minutes2} min. ${seconds2} sec.`,
        superH: false,
        geoSep: 'B',
        lat: lastLocation.lat,
        lon: lastLocation.lon
      };
      hospitalArray.push(newRow)
      
    }


    return hospitalArray.sort((a,b)=>a.distance-b.distance);
  };

    
  function filterAndSetHospitals(location, filterGeo) {
    if (!location) return;
    const base = renderHospitals();
  
    if (filterGeo === 'north') {
      setHospitalsArray(base.filter(h => h.geoSep === 'N' || h.geoSep === 'B' ));
    } else if (filterGeo === 'south') {
      setHospitalsArray(base.filter(h => h.geoSep === 'S' ||  h.geoSep === 'B'));
    } else {
      setHospitalsArray(base);
    }
  }
  useEffect(() => {
    filterAndSetHospitals(location, filterGeo);
  }, [filterGeo]);
  

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

      <div className="geo-location">
        <button className={filterGeo==='all'? "active":"not-active"} onClick={()=>setFilterGeo('all')}>All</button>
        <button className={filterGeo==='north'? "active":"not-active"} onClick={()=>setFilterGeo('north')}>North</button>
        <button className={filterGeo==='south'? "active":"not-active"} onClick={()=>setFilterGeo('south')}>South</button>
      </div>
      {hospitalsArray?.length>0 && (
        <ul className="hospital-list">
          {hospitalsArray.map((h, index) => (
            <li key={index} className={`${h.hospital==='Soroka'||h.hospital==='Rambam'? 'main-hospital' : ''}`}>
              <p className="hospital-name">{h.hospital}</p>
              <p className="eta">{h.eta}</p>
              <p className="distance">{h.distance.toFixed(2)} NM</p>

            </li>
          ))}
        </ul>
      )}

      {loadingMap&&<h2>Loading map..</h2>}
      <div className="location-box">
        <div className="auto-location-box" >
          <button className="btn-location" onClick={() => setMode("gps")} disabled={mode === "gps"}>
            Live Location
          </button>
          <p>Using device live location</p>
          <p>Update every 10 sec</p>
        </div>
        <div className="search-container">
          <button className="btn-location" onClick={() => setMode("manual")} disabled={mode === "manual"}>
            Search / Select target from map
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search a location..."
            className="search-box"
          />
          <p>No live location</p>
        </div>
      </div>

      <div className="map-hospitals">
        <div ref={mapRef} className="google-map" />
      </div>
    </div>
  );
}


//npm run deploy
