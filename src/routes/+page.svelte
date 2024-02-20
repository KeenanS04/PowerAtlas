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
      .range(["#a8ddb5", "#43a2ca", "#0868ac", "#084081"]);

    // After defining the colorScale
    const legendData = colorScale.range().map((color) => {
      const d = colorScale.invertExtent(color);
      if (d[0] == null) d[0] = colorScale.domain()[0];
      if (d[1] == null) d[1] = colorScale.domain()[1];
      return d;
    });
    console.log(legendData);

    // Create a legend group in your SVG (after creating the svg variable)
    const legend = svg
      .append("g")
      .attr("id", "legend")
      .attr("transform", `translate(${100}, ${height - 250})`); // Adjust position as needed

    // Assuming the legend and legendData are already defined
    // Calculate the size of the background based on the number of items
    const legendItems = legendData.length;
    const legendItemHeight = 30; // Height of each legend item, including spacing
    const legendWidth = 230; // Width of the legend, adjust as needed
    const legendHeight = legendItems * legendItemHeight + 30; // Height based on items, adjust padding as needed

    // Append a background rectangle to the legend group
    legend
  .append("rect")
  .attr("class", "legend-bg")
  .attr("x", -10)
  .attr("y", -30)
  .attr("width", legendWidth)
  .attr("height", legendHeight)
  .attr("fill", "white")
  .attr("stroke", "black")
  .attr("stroke-width", 1)
  .style("opacity", 0.8);

// Correctly append and update rectangles for each legend item
const legendRects = legend.selectAll(".legend-color-rect")
  .data(legendData)
  .enter()
  .append("rect")
  .attr("class", "legend-color-rect")
  .attr("x", 0)
  .attr("y", (d, i) => i * legendItemHeight)
  .attr("width", 20)
  .attr("height", 20)
  .style("fill", (d) => colorScale(d[0]));

// Add text labels to the legend
legend.selectAll(".legend-text")
  .data(legendData)
  .enter()
  .append("text")
  .attr("class", "legend-text")
  .attr("x", 30)
  .attr("y", (d, i) => i * legendItemHeight + 15)
  .text((d) => `${d[0].toFixed(2)} - ${d[1].toFixed(2)}`);

    // Optionally, add a title to your legend
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", -10) // Position above the first rectangle
      .text("Energy Consumption (TWh)")
      .attr("font-weight", "bold");

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
      // console.log(data);
      // console.log(energyData);
      geojsonData = data;
      globalEnergyData = energyData; // Set the globalEnergyData here
      updateMap(globalEnergyData, 2022); // Initial map for the year 2022
    });

    function calculateLineChartData(countryName, selectedYear) {
      const startYear = selectedYear - 2;
      const endYear = selectedYear + 2;
      const filteredData = globalEnergyData.filter(d =>
        d.country === countryName && d.year >= startYear && d.year <= endYear
      );

      // For simplicity, let's focus on primary_energy_consumption
      return filteredData.map(d => ({
        year: d.year,
        value: d.primary_energy_consumption // Adjust according to your data columns
      }));
    }

    function showLineChart(countryName, selectedYear) {
      const lineChartData = calculateLineChartData(countryName, selectedYear);

      const container = d3.select("#line-chart-container");
      container.html(""); // Clear previous content

      // Adjusted margins and increased visualization size
      const margin = {top: 50, right: 30, bottom: 70, left: 70},
          width = 400 - margin.left - margin.right, // Increased width
          height = 300 - margin.top - margin.bottom; // Increased height

      const svg = container.append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .style("background-color", "white")
        .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);
      
      svg.append("rect")
        .attr("width", width + margin.left + margin.right) // Cover full width including margins
        .attr("height", height + margin.top + margin.bottom) // Cover full height including margins
        .attr("x", -margin.left) 
        .attr("y", -margin.top) 
        .attr("fill", "white");

      // Calculate the domain for the X-axis based on available data
      let xDomain = d3.extent(lineChartData, d => d.year);
      // Adjust the domain if necessary based on the data availability
      if (xDomain.length < 5) {
          xDomain = [selectedYear - 2, selectedYear + 2]; // Default to a 5-year range
      }

      const x = d3.scaleLinear()
          .domain(xDomain)
          .range([0, width]);

      const y = d3.scaleLinear()
        .domain([d3.min(lineChartData, d => d.value), d3.max(lineChartData, d => d.value)])
        .range([height, 0])
        .nice();

      // Scales and axes setup remains the same

      // Append chart title
      svg.append("text")
          .attr("x", width / 2)
          .attr("y", 0 - (margin.top / 2))
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("text-decoration", "underline")
          .text(`${countryName} Energy Consumption Breakdown (${selectedYear-2} to ${selectedYear+2})`);

      // Append y-axis label
      svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - margin.left)
          .attr("x",0 - (height / 2))
          .attr("dy", "1em")
          .style("text-anchor", "middle")
          .text("Energy Consumption (TWh)");

      // Append x-axis label
      svg.append("text")
          .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 20})`)
          .style("text-anchor", "middle")
          .text("Years");

      svg.append("path")
          .datum(lineChartData)
          .attr("fill", "none")
          .attr("stroke", "steelblue")
          .attr("stroke-width", 2)
          .attr("d", d3.line()
            .x(d => x(d.year))
            .y(d => y(d.value))
          );

      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d"))); // Ensure only 5 ticks for the 5 years

      svg.append("g")
          .call(d3.axisLeft(y));
    }

    function updateMap(energyData, selectedYear) {
      const selectedEnergyType = document.getElementById("energy-type").value;
      // Optional: Recalculate the color scale domain based on current data
      // This example assumes you have a way to determine the min and max values for the current selection
      // For simplicity, we'll skip this step, but in a real scenario, you might adjust the colorScale's domain here

      // Clear any existing paths to avoid duplicates
      g.selectAll("path").remove();

      geojsonData.features.forEach(feature => {
          const countryData = energyData.find(d => d.country === feature.properties.name && parseInt(d.year, 10) === selectedYear);
          feature.properties.energy = countryData ? +countryData[selectedEnergyType] : 0;
      });

      // Draw the paths for each country with updated color
      g.selectAll("path")
        .data(geojsonData.features)
        .enter().append("path")
        .attr("d", pathGenerator)
        .attr("fill", d => colorScale(d.properties.energy) || "#ccc") // Use dynamic color based on the current value
        .on("mouseover", function(event, d) {
            // Highlight the country
            d3.select(this).style("opacity", 0.5);
            const countryName = d.properties.name;
            // Show the line chart for the hovered country
            showLineChart(countryName, selectedYear);

            // Position the line chart container
            d3.select("#line-chart-container")
              .style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY + 10}px`)
              .style("visibility", "visible");
        })
        .on("mouseout", function() {
            // Remove the highlight and hide the line chart
            d3.select(this).style("opacity", 1);
            d3.select("#line-chart-container").style("visibility", "hidden");
        });
    }

    d3.select("#energy-type").on("change", function () {
      const selectedYear = parseInt(
        document.getElementById("year-slider").value,
        10,
      );
      updateMap(globalEnergyData, selectedYear); // Update map based on the new energy type
    });

    // Adjust the year slider listener if needed to ensure it uses the current energy type
    d3.select("#year-slider").on("input", function (event) {
      const currentYear = parseInt(event.target.value, 10); // Get the current year from the slider
      document.getElementById("year-label").textContent = currentYear; // Update the label with the current year
      updateMap(globalEnergyData, currentYear); // Update the map based on the new year
    });
  });
</script>

<main>
  <h1 class="title">World Energies</h1>
  <div id="energy-type-selector">
    <label for="energy-type">Choose Energy Type:</label>
    <select id="energy-type">
      <option value="primary_energy_consumption"
        >Primary Energy Consumption</option
      >
      <option value="biofuel_consumption">Biofuel Consumption</option>
      <option value="coal_consumption">Coal Consumption</option>
      <option value="fossil_fuel_consumption">Fossil Fuel Consumption</option>
      <option value="gas_consumption">Gas Consumption</option>
      <option value="hydro_consumption">Hydro Consumption</option>
      <option value="low_carbon_consumption">Low Carbon Consumption</option>
      <option value="nuclear_consumption">Nuclear Consumption</option>
      <option value="oil_consumption">Oil Consumption</option>
      <option value="other_renewable_consumption"
        >Other Renewable Consumption</option
      >
      <option value="renewables_consumption">Renewables Consumption</option>
      <option value="solar_consumption">Solar Consumption</option>
      <option value="wind_consumption">Wind Consumption</option>
    </select>
  </div>
  <div id="slider-container">
    <input type="range" id="year-slider" min="1965" max="2022" value="2022" />
    <span id="year-label" style="margin-left: 10px;">2022</span>
  </div>
  <div id="line-chart-container" style="position: absolute; visibility: hidden; width: 300px; height: 200px; background-color: white; border: 1px solid #ccc; pointer-events: none;"></div>
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
    display: flex; /* Use flexbox */
    justify-content: center; /* Center horizontally */
    align-items: center; /* Align items vertically */
    width: 80%; /* Adjust based on preference */
    margin: 20px auto; /* Center the container with automatic margins */
  }

  #year-slider {
    -webkit-appearance: none; /* For WebKit */
    width: calc(100% - 60px); /* Adjust width to leave space for year label */
    margin: 0; /* Remove any default margin */
    height: 15px; /* Custom height */
    background: #333; /* Darker background for better visibility */
    border-radius: 7.5px; /* Optional: Adds rounded corners */
    outline: none;
  }

  #year-slider:hover {
    opacity: 1; /* Fully opaque on hover */
  }

  #year-slider::-webkit-slider-thumb {
    -webkit-appearance: none; /* Override default appearance */
    appearance: none;
    width: 25px; /* Make the thumb larger */
    height: 25px; /* Make the thumb larger */
    background: #4caf50;
    cursor: pointer;
  }

  #year-slider::-moz-range-thumb {
    width: 25px; /* Make the thumb larger */
    height: 25px; /* Make the thumb larger */
    background: #4caf50;
    cursor: pointer;
  }

  #year-display {
    margin-top: 10px;
  }
</style>
