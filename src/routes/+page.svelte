<script>
  import * as d3 from "d3";
  import { onMount } from "svelte";

  onMount(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    let geojsonData;
    let globalEnergyData;
    let currentEnergyType = 'primary_energy_consumption';

    const colorScales = {
      biofuel_consumption: d3.scaleSequential(d3.interpolateGreens),
      coal_consumption: d3.scaleSequential(d3.interpolateGreys),
      fossil_fuel_consumption: d3.scaleSequential(d3.interpolateOrRd),
      gas_consumption: d3.scaleSequential(d3.interpolateBlues),
      hydro_consumption: d3.scaleSequential(d3.interpolateBuGn),
      low_carbon_consumption: d3.scaleSequential(d3.interpolateRdPu),
      nuclear_consumption: d3.scaleSequential(d3.interpolateInferno),
      oil_consumption: d3.scaleSequential(d3.interpolateViridis),
      other_renewable_consumption: d3.scaleSequential(d3.interpolateMagma),
      primary_energy_consumption: d3.scaleSequential(d3.interpolateCividis),
      renewables_consumption: d3.scaleSequential(d3.interpolateCool),
      solar_consumption: d3.scaleSequential(d3.interpolateWarm),
      wind_consumption: d3.scaleSequential(d3.interpolateSpectral)
    };

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

    Object.keys(colorScales).forEach(key => {
      colorScales[key].domain(energyDomain);
    });

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

      const selectedColorScale = colorScales[currentEnergyType];

      geojsonData.features.forEach((feature) => {
        feature.properties.energy = energyDataMap.get(feature.properties.name);
        const country = feature.properties.name;
        const energy = energyDataMap.get(country);
        if (energy && energy[currentEnergyType]) {
          feature.properties.energy = +energy[currentEnergyType];
        } else {
          delete feature.properties.energy;
    }
      });
      console.log(geojsonData);
      g.selectAll("path")
        .data(geojsonData.features)
        .join("path")
        .attr("d", pathGenerator)
        .attr("fill", d => {
          const energy = d.properties.energy ? d.properties.energy[currentEnergyType] : null;
          return energy ? selectedColorScale(energy) : 'lightgray';
        });
    }

    d3.select("#year-slider").on("input", function(event) {
      document.getElementById('year-label').textContent = event.target.value;
      updateMap(event.target.value);
    });

    d3.select('#energy-type').on('change', function(event) {
      currentEnergyType = event.target.value;
      updateMap(document.getElementById('year-slider').value);
    });
  });
</script>

<main>
  <h1 class="title">World Energies</h1>
  <div id="energy-type-selector">
  <label for="energy-type">Choose Energy Type:</label>
  <select id="energy-type">
    <option value="primary_energy_consumption">Primary Energy Consumption</option>
    <option value="biofuel_consumption">Biofuel Consumption</option>
    <option value="coal_consumption">Coal Consumption</option>
    <option value="fossil_fuel_consumption">Fossil Fuel Consumption</option>
    <option value="gas_consumption">Gas Consumption</option>
    <option value="hydro_consumption">Hydro Consumption</option>
    <option value="low_carbon_consumption">Low Carbon Consumption</option>
    <option value="nuclear_consumption">Nuclear Consumption</option>
    <option value="oil_consumption">Oil Consumption</option>
    <option value="other_renewable_consumption">Other renewable Consumption</option>
    <option value="renewables_consumption">Renewables Consumption</option>
    <option value="solar_consumption">Solar Consumption</option>
    <option value="wind_consumption">Wind Consumption</option>
  </select>
</div>
  <div id="slider-container">
    <input type="range" id="year-slider" min="1965" max="2022" value="2022" />
  </div>
  <div id="year-display">Selected Year: <span id="year-label">2022</span></div>
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

  #energy-type-selector {
  text-align: center;
  margin-bottom: 10px; /* Spacing between the dropdown and the slider */
  }

  #energy-type {
    padding: 5px;
    font-size: 16px;
    cursor: pointer;
  }

  #slider-container {
  width: 80%; /* Makes the slider take up more horizontal space */
  margin: 0 auto; /* Centers the slider */
  }

  #year-display {
    text-align: center;
    margin: 10px 0;
    font-size: 16px;
}
</style>
