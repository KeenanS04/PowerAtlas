<script>
  import * as d3 from "d3";
  import { onMount } from "svelte";

  onMount(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    let geojsonData;
    let globalEnergyData;

    const svg = d3
      .select("#map")
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100vh") // Use 100vh to take up the full viewport height
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g");

    const projection = d3
      .geoNaturalEarth1()
      .translate([width / 2, height / 2])
      .scale(width / 2 / Math.PI);

    const pathGenerator = d3.geoPath().projection(projection);

    const colorScale = d3
      .scaleThreshold()
      .domain([10.61, 69.34, 345.49, 44275.91])
      .range(["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6"]);

    // Implement zoom and pan functionality
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8]) // Limit zoom scale
      .translateExtent([
        [0, 0],
        [width, height],
      ]) // Limit panning to these extents
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom); // Apply the zoom behavior to the SVG

    // Prevent scrolling on zoom
    svg.on("wheel", (event) => {
      event.preventDefault(); // Stop the page from scrolling
    });

    Promise.all([
      d3.json("custom.geo.json"),
      d3.csv("energy_filtered.csv"),
    ]).then(([data, energyData]) => {
      console.log(data);
      console.log(energyData);
      geojsonData = data;
      globalEnergyData = energyData; // Set the globalEnergyData here
      updateMap(globalEnergyData, 2022); // Initial map for the year 2022
    });

    function updateMap(energyData, selectedYear) {
      const energyDataMap = new Map();
      energyData.forEach((d) => {
        if (parseInt(d.year, 10) === selectedYear) {
          energyDataMap.set(d.country, +d.renewables_consumption);
        }
      });

      geojsonData.features.forEach((feature) => {
        feature.properties.energy = energyDataMap.get(feature.properties.name);
      });
      console.log(geojsonData);
      g.selectAll("path")
        .data(geojsonData.features)
        .join("path")
        .attr("d", pathGenerator)
        .attr("fill", function (d) {
          // console.log(d.properties.energy); // Check the energy value
          return colorScale(d.properties.energy) || "#ccc";
        });
    }

    d3.select("#year-slider").on("input", function (event) {
      updateMap(globalEnergyData, parseInt(event.target.value, 10));
    });
  });
</script>

<main>
  <h1 class="title">World Energies</h1>
  <div id="slider-container">
    <input type="range" id="year-slider" min="1965" max="2022" value="2022" />
  </div>
  <div id="map"></div>
</main>

<style>
  .title {
    text-align: center;
    margin: 0;
    padding: 0;
    background-color: #f9f9f9;
    color: #333;
  }

  body,
  html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  main {
    display: flex;
    flex-direction: column; /* Stack children vertically */
    height: 100vh; /* Make main element take full viewport height */
  }

  #map {
    flex-grow: 1; /* Allow the map to take up the remaining space */
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden; /* Prevent scrollbars within the map container */
  }

  svg {
    width: 100%; /* Fill the width of its container */
    height: 100%; /* Fill the height of its container */
  }

  #slider-container {
    text-align: center;
    margin: 20px;
  }
</style>
