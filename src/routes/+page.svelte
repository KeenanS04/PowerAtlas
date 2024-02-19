<script>
  import * as d3 from "d3";
  import { onMount } from "svelte";

  // Load and draw the world map
  onMount(() => {
    // Define width and height for the SVG
    const width = window.innerWidth;
    const height = window.innerHeight;
    let geojsonData;
    let globalEnergyData;

    const svg = d3
      .select("#map")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .call(
        d3.zoom().scaleExtent([1, 8]).on("zoom", (event) => {
          g.attr("transform", event.transform);
        }),
      )
      .append("g");

    const projection = d3
      .geoNaturalEarth1()
      .scale(width / 2 / Math.PI)
      .translate([width / 2, height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    const g = svg.append("g");

    const colorScale = d3
      .scaleThreshold()
      .domain([10.61, 69.34, 345.49, 44275.91])
      .range(["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6"]);

    d3.json("custom.geo.json")
      .then(function (data) {
        // Load the energy data inside the GeoJSON callback
        geojsonData = data;
        d3.csv("energy_filtered.csv")
          .then(function (energyData) {
            globalEnergyData = energyData;

            const energyDataMap = new Map();
            energyData.forEach(function (d) {
              energyDataMap.set(d.country, d);
            });

            data.features.forEach(function (feature) {
              const country = feature.properties.name;
              const energy = energyDataMap.get(country);
              if (energy) {
                feature.properties.energy = energy;
              }
            });

            // Draw the map with the joined data
            g.selectAll("path")
              .data(data.features)
              .join("path")
              .attr("d", pathGenerator)
              // Set fill based on energy data, with a fallback color if no data is present
              .attr("fill", function (d) {
                const energyValue = d.properties.energy
                  ? +d.properties.energy.total_energy
                  : null;
                return energyValue ? colorScale(energyValue) : "blue";
              });
            updateMap(2022);
          }
          )
          .catch(function (error) {
            console.error("Error loading the CSV data: ", error);
          });
          
      })
      .catch(function (error) {
        console.error("Error loading the GeoJSON data: ", error);
      });

    d3.select("#year-slider").on("input", function (event) {
      updateMap(event.target.value);
    });

    function updateMap(selectedYear) {
      // Parse the selectedYear to ensure it's an integer
      selectedYear = parseInt(selectedYear, 10);
      // Filter the energy data based on the selected year
      const filteredData = globalEnergyData.filter(
        (d) => parseInt(d.year, 10) === selectedYear,
      );

      // Create a map of country name to energy data for quick lookup
      const energyDataMap = new Map();
      filteredData.forEach(function (d) {
        energyDataMap.set(d.country, d);
      });

      // Check if geojsonData is loaded
      if (!geojsonData) {
        console.error("GeoJSON data is not yet loaded.");
        return; // Exit the function if data is not loaded
      }

      // Join the energy data to the GeoJSON features
      geojsonData.features.forEach(function (feature) {
        const country = feature.properties.name;
        const energy = energyDataMap.get(country);
        if (energy && energy.primary_energy_consumption) {
          // Ensure energy value is a number using the unary plus (+)
          feature.properties.energy = +energy.primary_energy_consumption;
        } else {
          // If no data for the year or country, delete the energy property
          delete feature.properties.energy;
        }
      });

      // Update the map paths with new data
      g.selectAll("path")
        .data(geojsonData.features)
        .join("path")
        .attr("d", pathGenerator)
        .transition() // Animate color transition
        .duration(500)
        // Set fill based on energy data, with a fallback color if no data is present
        .attr("fill", function (d) {
          // Use the energy property for the color scale if it exists
          return d.properties.energy
            ? colorScale(d.properties.energy)
            : "lightgray"; // Fallback color
        });
    }
    window.addEventListener("resize", () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      svg.attr("width", width).attr("height", height);

      projection.translate([width / 2, height / 2]).scale(width / 2 / Math.PI);
      g.selectAll("path").attr("d", pathGenerator);
    });
  });
</script>

<!-- This is where your SVG map will be appended -->
<main>
  <h1 class="title">World Energies</h1>
  <div id="slider-container">
    <input type="range" id="year-slider" min="1965" max="2022" value="2022" />
  </div>
  <div id="tooltip" class="tooltip" style="opacity:0;"></div>
  <div id="map"></div>
</main>

<style>
  /* Style for the map container */
  .title {
    text-align: center;
    margin: 0;
    padding: 20px;
    background-color: #f9f9f9;
    color: #333;
  }

  body,
  html {
    margin: 0;
    padding: 0;
    height: 100%;
  }

  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  #map {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0;
    border: none; /* Adjust as needed */
  }

  svg {
    width: 100%; /* Make SVG take up all of the container's width */
    height: auto; /* Adjust height automatically */
    max-height: 100%; /* Ensure it doesn't overflow its container */
  }
  /* #map {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 20px;
    border: 1px solid #ccc;
    background-color: #f9f9f9;
  } */

  /* Style for the SVG element */
  svg {
    display: block; /* removes bottom margin/whitespace */
    background-color: #e6e6e6; /* light grey background for contrast */
    border-radius: 8px; /* optional: rounds corners of the map */
  }

  /* Tooltip styling */
  .tooltip {
    position: absolute;
    text-align: center;
    padding: 6px;
    font: 12px sans-serif;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
  }

  #slider-container {
    text-align: center;
    margin: 20px;
  }

  /* Tooltip styling (adjust as necessary) */
  .tooltip {
    position: absolute;
    text-align: center;
    padding: 6px;
    font: 12px sans-serif;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
  }
</style>
