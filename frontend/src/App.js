import "mapbox-gl/dist/mapbox-gl.css";
import React, { useState } from "react";
import Map, { Layer, Source } from "react-map-gl";
import "react-tooltip/dist/react-tooltip.css";
import "./App.css";
import Drawer from "./components/Drawer";
import LoadingIndicator from "./components/LoadingIndicator";
import Navigation from "./components/Navigation";

function App() {
  const [selectedSpecies, setSelectedSpecies] = useState({});
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: -100,
    latitude: 40,
    zoom: 1,
  });
  function close() {
    setOpen(false);
    setError(false);
    setSelectedSpecies({});
  }

  function calculateBoundingBox(lat, lng, radiusKm) {
    const earthRadiusKm = 6371; // Earth's radius in kilometers

    // Convert degrees to radians
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;

    // Radius in radians
    const angularRadius = radiusKm / earthRadiusKm;

    // Latitude bounds
    const minLat = latRad - angularRadius;
    const maxLat = latRad + angularRadius;

    // Longitude bounds (adjust for latitude)
    const minLng = lngRad - angularRadius / Math.cos(latRad);
    const maxLng = lngRad + angularRadius / Math.cos(latRad);

    // Convert back to degrees and round to 1 decimal point
    return {
      minLat: +((minLat * 180) / Math.PI).toFixed(1),
      maxLat: +((maxLat * 180) / Math.PI).toFixed(1),
      minLng: +((minLng * 180) / Math.PI).toFixed(1),
      maxLng: +((maxLng * 180) / Math.PI).toFixed(1),
    };
  }

  function getRadiusFromZoom(zoom) {
    if (zoom >= 15) return 100;
    if (zoom >= 12) return 200;
    if (zoom >= 8) return 300;
    if (zoom >= 5) return 400;
    return 800;
  }

  const handleMapClick = async (event) => {
    if (event.features && event.features.length > 0) {
      const feature = event.features[0]; // Get the first feature clicked
      if (feature) {
        const speciesName = feature.properties.species; // Ensure this matches your property
        getSpeciesInfo(speciesName);
      }
    } else {
      setLoading(true);
      const { lat, lng } = event.lngLat;

      const radiusKm = getRadiusFromZoom(viewState.zoom); // Adjust radius based on zoom

      const bounds = calculateBoundingBox(lat, lng, radiusKm);

      const apiFormattedLat = `${bounds.minLat},${bounds.maxLat}`;
      const apiFormattedLng = `${bounds.minLng},${bounds.maxLng}`;

      try {
        const response = await fetch(
          `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${apiFormattedLat}&decimalLongitude=${apiFormattedLng}&iucnRedListCategory=EN&iucnRedListCategory=CE&iucnRedListCategory=VU&limit=300`
        );
        const data = await response.json();

        const groupedBySpeciesArray = Object.values(
          data.results.reduce((acc, current) => {
            const speciesName = current?.species;
            if (!speciesName) {
              return acc;
            }
            // If the species isn't already a key in the accumulator, add it
            if (!acc[speciesName]) {
              acc[speciesName] = {
                species: speciesName,
                kingdom: current.kingdom,
                occurrences: [], // Initialize the occurrences array
              };
            }

            // Push the current occurrence to the species' occurrences array
            acc[speciesName].occurrences.push({
              month: current.month,
              day: current.day,
              year: current.year,
              latitude: current.decimalLatitude,
              longitude: current.decimalLongitude,
            });

            return acc;
          }, {})
        );

        setSpecies(groupedBySpeciesArray);
      } catch (error) {
        console.error("Error fetching occurence data:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  async function getSpeciesInfo(species) {
    try {
      const response = await fetch(`/api/speciesSearch/${species}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        setError(true);
        setOpen(true);
        return;
      }
      const data = await response.json();
      setSelectedSpecies(data);
      setOpen(true);
    } catch (error) {
      console.error("Error fetching species data:", error);
    }
  }

  return (
    <>
      <Navigation />
      <div style={{ width: "100vw", height: "100vh" }}>
        <Map
          mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
          initialViewState={viewState}
          mapStyle="mapbox://styles/mapbox/dark-v10"
          width="100%"
          height="100%"
          onMove={(event) => setViewState(event.viewState)}
          onClick={handleMapClick}
          interactiveLayerIds={["unclustered-point"]}
        >
          {loading && <LoadingIndicator />}

          <Source
            id="species-data"
            type="geojson"
            data={{
              type: "FeatureCollection",
              features: species
                .map((sp) =>
                  sp.occurrences.map((occ) => ({
                    type: "Feature",
                    geometry: {
                      type: "Point",
                      coordinates: [occ.longitude, occ.latitude],
                    },
                    properties: {
                      species: sp.species,
                    },
                  }))
                )
                .flat(),
            }}
            cluster={true}
            clusterMaxZoom={14} // Max zoom to cluster points
            clusterRadius={50} // Radius of each cluster in pixels
          >
            <Layer
              id="clusters"
              type="circle"
              source="species-data"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": "#51bbd6",
                "circle-radius": 20,
              }}
            />
            <Layer
              id="cluster-count"
              type="symbol"
              source="species-data"
              filter={["has", "point_count"]}
              layout={{
                "text-field": "{point_count_abbreviated}",
                "text-size": 12,
              }}
            />
            <Layer
              id="unclustered-point"
              type="circle"
              source="species-data"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": "#11b4da",
                "circle-radius": 8,
              }}
            />
          </Source>
        </Map>
      </div>
      {open && (
        <Drawer selectedSpecies={selectedSpecies} error={error} close={close} />
      )}
    </>
  );
}

export default App;
