import React from "react";
import Map from "react-map-gl";
import "./App.css";

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map
        mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
        latitude={37.7577}
        longitude={-122.4376}
        zoom={8}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        width="100%"
        height="100%"
      />
    </div>
  );
}

export default App;
