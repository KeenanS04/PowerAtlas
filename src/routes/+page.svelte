<script>
  import * as d3 from "d3";
  import { onMount } from "svelte";

  onMount(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    let geojsonData;
    let globalEnergyData;
    // --- Method to wrap SVG text ---
    function wrap(text, width) {
      text.each(function () {
        var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1, // ems
          y = text.attr("y"),
          x = text.attr("x"), // Get the 'x' position of the parent text element
          dy = parseFloat(text.attr("dy") || 0),
          tspan = text
            .text(null)
            .append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", dy + "em");

        while ((word = words.pop())) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > width) {
            line.pop(); // Remove the word that overflowed
            tspan.text(line.join(" "));
            line = [word]; // Start a new line with the overflowed word
            tspan = text
              .append("tspan")
              .attr("x", x)
              .attr("y", y)
              .attr("dy", ++lineNumber * lineHeight + dy + "em")
              .text(word);
          }
        }
      });
    }

    const svg = d3
      .select("#map")
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100vh") // Use 100vh to take up the full viewport height
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const defs = svg.append("defs");

    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("markerWidth", 10)
      .attr("markerHeight", 7)
      .attr("refX", 0)
      .attr("refY", 3.5)
      .attr("orient", "auto")
      .append("polygon")
      .attr("points", "0 0, 10 3.5, 0 7");

    const g = svg.append("g");

    g.append("text")
      .attr("class", "text-group")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-family", "Roboto, sans-serif")
      .style("font-size", "22px")
      .text(
        "Hover over each country to see the % change in that countries energy consumption",
      );

    const projection = d3
      .geoNaturalEarth1()
      .translate([width / 2, height / 2])
      .scale(width / 2 / Math.PI);

    const pathGenerator = d3.geoPath().projection(projection);

    const colorScale = d3
      .scaleThreshold()
      .domain([0, 10.61, 69.34, 345.49, 44275.91])
      .range(["#7474b0", "#83aff0", "#4779c4", "#3c649f", "#2c456b"]);

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
      .attr("transform", `translate(${50}, ${height - 300})`); // Adjust position as needed

    function updateColorScaleAndLegend(energyData, selectedEnergyType) {
      // Get all the non-null values for the selected energy type from the data.
      const energyValues = energyData
        .map((d) => +d[selectedEnergyType])
        .filter((val) => !isNaN(val) && val !== 0);

      // Calculate quantiles for the color scale domain.
      const quantileSteps = 5; // Number of color categories you want - 1.
      const quantiles = [];
      for (let i = 1; i <= quantileSteps; i++) {
        quantiles.push(
          d3.quantile(energyValues.sort(d3.ascending), i / quantileSteps),
        );
      }

      // Set up the color scale with the calculated quantiles.
      colorScale.domain(quantiles);

      // Update the legend with the new color scale.
      updateLegend(colorScale);
    }

    // This function will be used to update the legend based on the color scale.
    function updateLegend(colorScale) {
      // Select the legend group and update the rects and texts.
      const legend = svg.select("#legend");

      let legendData = colorScale.range().map((color, i) => {
        const extent = colorScale.invertExtent(color);
        if (i === 0 && extent[0] == null) {
          // Check for the first element and null value
          extent[0] = 0; // Set the start of the first extent to 0
        }
        return extent;
      });

      legendData = legendData.map((extent, i, array) => {
        if (extent[1] == null) {
          extent[1] =
            i === array.length - 1
              ? colorScale.domain()[colorScale.domain().length - 1]
              : array[i + 1][0];
        }
        return extent;
      });
      const legendRects = legend
        .selectAll(".legend-color-rect")
        .data(legendData);

      legendRects.exit().remove(); // Remove any excess rects.

      legendRects
        .enter()
        .append("rect")
        .attr("class", "legend-color-rect")
        .merge(legendRects) // Combine enter and update selections.
        .attr("x", 0)
        .attr("y", (d, i) => i * legendItemHeight)
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", (d) => colorScale(d[0]));

      // Update the text labels for each legend item.
      const legendTexts = legend.selectAll(".legend-text").data(legendData);

      legendTexts.exit().remove(); // Remove any excess texts.

      legendTexts
        .enter()
        .append("text")
        .attr("class", "legend-text")
        .merge(legendTexts) // Combine enter and update selections.
        .attr("x", 30)
        .attr("y", (d, i) => i * legendItemHeight + 15)
        .text((d) => `${d[0].toFixed(2)} - ${d[1].toFixed(2)}`);
    }

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
    const legendRects = legend
      .selectAll(".legend-color-rect")
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
    legend
      .selectAll(".legend-text")
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
    const initialScale = 1;
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8]) // Assuming your scale extent is from 1 to 8
      .on("zoom", (event) => {
        g.attr("transform", event.transform); // Apply the zoom and pan

        // Check if the current scale is the initial scale
        const isInitialScale = event.transform.k === initialScale;

        // Select all annotations and adjust their visibility
        svg
          .selectAll(
            ".country-annotation-group, .annotation-group",
            ".text-group",
          )
          .style("display", isInitialScale ? null : "none");
      });

    svg.call(zoom);

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
      globalEnergyData = energyData;
      const initialYear = 2021;
      const initialEnergyType = "primary_energy_consumption";
      updateColorScaleAndLegend(globalEnergyData, initialEnergyType);
      updateMap(globalEnergyData, initialYear);
      // updateAnnotation(svg, initialEnergyType);
      // updateCountryAnnotation(svg, initialEnergyType, geojsonData);
      document.getElementById("energy-type").value = initialEnergyType;
      document.getElementById("year-slider").value = initialYear;
      document.getElementById("year-label").textContent = initialYear;
    });

    function calculateLineChartData(countryName, selectedYear, energyType) {
      const startYear = selectedYear - 2;
      const endYear = selectedYear + 2;
      const filteredData = globalEnergyData.filter(
        (d) =>
          d.country === countryName && d.year >= startYear && d.year <= endYear,
      );

      const percentChanges = filteredData.map((d, i, arr) => {
        if (i === 0) return { year: d.year, value: 0 }; // No change for the first year
        const prevValue = +arr[i - 1][energyType];
        const currentValue = +d[energyType];
        const percentChange = ((currentValue - prevValue) / prevValue) * 100;

        return { year: d.year, value: percentChange };
      });

      return percentChanges;
    }

    function calculateTotalLineChartData(selectedYear, energyType, energyData) {
      // Calculate the total energy consumption for each year for the selected energy type
      if (!Array.isArray(energyData)) {
        console.error("energyData is not an array", energyData);
        return []; // Return an empty array or handle this case appropriately
      }
      const startYear = selectedYear - 2;
      const endYear = selectedYear + 2;
      let yearTotals = {};

      energyData.forEach((d) => {
        const year = parseInt(d.year, 10);
        const value = +d[energyType];
        if (!isNaN(value) && year >= startYear && year <= endYear) {
          if (!yearTotals[year]) {
            yearTotals[year] = 0;
          }
          yearTotals[year] += value;
        }
      });

      // Convert the totals into an array of { year, value } objects and sort by year
      let totalLineChartData = Object.keys(yearTotals)
        .map((year) => ({
          year: +year,
          value: yearTotals[year],
        }))
        .sort((a, b) => a.year - b.year);

      const startYearData = totalLineChartData.find(
        (d) => d.year === selectedYear - 2,
      );
      if (startYearData) {
        const startValue = startYearData.value;
        totalLineChartData = totalLineChartData.map((d) => ({
          year: d.year,
          value: ((d.value - startValue) / startValue) * 100, // Calculate the percentage change
        }));
      } else {
        // If there is no data for the start year, default to 0 percent change
        totalLineChartData = totalLineChartData.map((d) => ({
          year: d.year,
          value: 0,
        }));
      }

      return totalLineChartData;
    }

    function showLineChart(countryName, selectedYear) {
      const selectedEnergyType = document.getElementById("energy-type").value;
      const lineChartData = calculateLineChartData(
        countryName,
        selectedYear,
        selectedEnergyType,
      );
      const totalLineChartData = calculateTotalLineChartData(
        selectedYear,
        selectedEnergyType,
        globalEnergyData,
      );

      const container = d3.select("#line-chart-container");
      container.html(""); // Clear previous content

      // Adjusted margins and increased visualization size
      const margin = { top: 50, right: 30, bottom: 70, left: 70 },
        width = 400 - margin.left - margin.right, // Increased width
        height = 300 - margin.top - margin.bottom; // Increased height

      const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "white")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      svg
        .append("rect")
        .attr("width", width + margin.left + margin.right) // Cover full width including margins
        .attr("height", height + margin.top + margin.bottom) // Cover full height including margins
        .attr("x", -margin.left)
        .attr("y", -margin.top)
        .attr("fill", "white");

      // Calculate the domain for the X-axis based on available data
      const combinedData = lineChartData.concat(totalLineChartData);

      // Calculate the domain for the X-axis based on available data
      let xDomain = d3.extent(combinedData, (d) => d.year);

      // Adjust the domain if necessary based on the data availability
      if (xDomain.length < 5) {
        xDomain = [selectedYear - 2, selectedYear + 2]; // Default to a 5-year range
      }

      // Calculate the domain for the Y-axis based on the combined data
      const yDomain = [
        d3.min(combinedData, (d) => d.value),
        d3.max(combinedData, (d) => d.value),
      ];

      const x = d3.scaleLinear().domain(xDomain).range([0, width]);
      const y = d3.scaleLinear().domain(yDomain).range([height, 0]).nice();

      // Scales and axes setup remains the same

      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Percent Change (%)"); // Updated label text

      // Append chart title
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", 0 - margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text(
          `${countryName} Energy Consumption Percent Change (${
            selectedYear - 2
          } to ${selectedYear + 2})`,
        )
        .call(wrap, width);

      // Append x-axis label
      svg
        .append("text")
        .attr(
          "transform",
          `translate(${width / 2}, ${height + margin.bottom - 20})`,
        )
        .style("text-anchor", "middle")
        .text("Years");

      svg
        .append("path")
        .datum(lineChartData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr(
          "d",
          d3
            .line()
            .x((d) => x(d.year))
            .y((d) => y(d.value)),
        );

      svg
        .append("path")
        .datum(totalLineChartData)
        .attr("fill", "none")
        .attr("stroke", "orange") // Use a different color for the total line
        .attr("stroke-width", 2)
        .attr(
          "d",
          d3
            .line()
            .x((d) => x(d.year))
            .y((d) => y(d.value)),
        );

      svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d"))); // Ensure only 5 ticks for the 5 years

      svg.append("g").call(d3.axisLeft(y));

      const legendPadding = 10; // Padding from the right and bottom edges
      const legendMargin = 20; // Space between legend items

      // Calculate starting positions for the legend based on the SVG dimensions
      const legendX = width - 340; // Adjust this value as needed to fit within your visualization
      const legendY = height + 25; // Adjust this value to position the legend at the bottom

      // Create a legend group
      const lineChartLegend = svg
        .append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

      // Country Line Legend
      lineChartLegend
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", "steelblue");

      lineChartLegend
        .append("text")
        .attr("x", 20)
        .attr("y", 10)
        .text(`${countryName} % Change`)
        .style("font-size", "12px")
        .attr("alignment-baseline", "middle");

      // Total Line Legend
      lineChartLegend
        .append("rect")
        .attr("x", 0)
        .attr("y", 20) // Adjust this to change the vertical spacing between legend items
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", "orange");

      lineChartLegend
        .append("text")
        .attr("x", 20)
        .attr("y", 30) // Aligns with the 'Total % Change' legend rectangle
        .text("Total % Change")
        .style("font-size", "12px")
        .attr("alignment-baseline", "middle");
    }

    function updateMap(energyData, selectedYear) {
      const selectedEnergyType = document.getElementById("energy-type").value;

      geojsonData.features.forEach((feature) => {
        const countryData = energyData.find(
          (d) =>
            d.country === feature.properties.name &&
            parseInt(d.year, 10) === selectedYear,
        );
        feature.properties.energy = countryData
          ? +countryData[selectedEnergyType]
          : 0;
      });

      const paths = g
        .selectAll("path.country")
        .data(geojsonData.features, (d) => d.properties.name);

      paths
        .enter()
        .append("path")
        .attr("class", "country")
        .merge(paths)
        .attr("d", pathGenerator)
        .attr("fill", (d) => colorScale(d.properties.energy) || "#ccc")
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .on("mouseover", function (event, d) {
          // Highlight the country
          d3.select(this).style("opacity", 0.5);
          const countryName = d.properties.name;
          // Show the line chart for the hovered country
          showLineChart(countryName, selectedYear);

          // Dynamically calculate position to ensure the chart doesn't go off-screen
          const chartContainer = document.getElementById(
            "line-chart-container",
          );
          const chartWidth = chartContainer.offsetWidth;
          const chartHeight = chartContainer.offsetHeight;
          const pageX = event.pageX;
          const pageY = event.pageY;
          // Get the map boundaries
          const mapBounds = pathGenerator.bounds(geojsonData);
          const mapWidth = mapBounds[1][0] - mapBounds[0][0];
          const mapHeight = mapBounds[1][1] - mapBounds[0][1];

          // Adjust left position to avoid overflow
          let left =
            pageX + 10 + chartWidth > mapWidth
              ? pageX - chartWidth - 90
              : pageX + 15;
          // Adjust top position to avoid overflow
          let top =
            pageY + chartHeight > mapHeight
              ? mapHeight - chartHeight - 100
              : pageY;

          d3.select("#line-chart-container")
            .style("left", `${left}px`)
            .style("top", `${top}px`)
            .style("visibility", "visible");
        })
        .on("mouseout", function () {
          // Remove the highlight and hide the line chart
          d3.select(this).style("opacity", 1);
          d3.select("#line-chart-container").style("visibility", "hidden");
        });
    }

    // function updateAnnotation(svg, selectedEnergyType) {
    //   svg.selectAll(".annotation-group").remove();

    //   // Create an annotation group
    //   const annotationGroup = svg.append("g")
    //     .attr("class", "annotation-group")
    //     .attr("transform", "translate(10, 100)"); // Adjust position as needed

    //   // Sample text to demonstrate multi-line
    //   const lines = [
    //     "See how",
    //     "the world's",
    //     `${selectedEnergyType}`,
    //     "changes throughout",
    //     "the years"
    //   ];

    //   // Calculate background dimensions
    //   const lineHeight = 20; // Adjust the line height as needed
    //   const padding = 10; // Adjust padding around text as needed

    //   // Append text lines as tspan elements
    //   const text = annotationGroup.append("text")
    //     .attr("x", padding)
    //     .attr("y", padding)
    //     .style("fill", "white")
    //     .style("font-family", "Roboto, sans-serif")
    //     .style("font-size", "16px");

    //   lines.forEach((line, index) => {
    //     text.append("tspan")
    //       .attr("x", padding)
    //       .attr("dy", lineHeight)
    //       .text(line);
    //   });
    // }

    function highlightCountry(countryName, svg, geojsonData) {
  // Normalize the typed country name for comparison
  const normalizedCountryName = countryName.trim().toLowerCase();

  // Reset styles for all countries
  svg.selectAll("path.country")
    .attr("fill", (d) => colorScale(d.properties.energy) || "#ccc")
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5);

  // Apply highlight styles directly to the matching country
  svg.selectAll("path.country").each(function(d) {
    const dataCountryName = d.properties.name.trim().toLowerCase();
    if (dataCountryName === normalizedCountryName) {
      d3.select(this)
        .attr("fill", "#5c6b73") // Directly set fill color
        .attr("stroke-width", 2); // Directly set stroke width
    }
  });
}

    // Set up the event listener for the country-name input field to trigger highlighting
    d3.select("#country-name").on("input", function () {
      const typedName = d3.select(this).property("value");
      highlightCountry(typedName, svg, geojsonData);
    });

    // Ensure the geojson path elements have the correct class to target
    // g.selectAll("path")
    //   .data(geojsonData.features)
    //   .enter()
    //   .append("path")
    //   // Add class to each country path for selection
    //   .attr("class", "country")
    //   .attr("d", pathGenerator)

    // const energyTypeToCountry = {
    //   'primary_energy_consumption': 'Pakistan',
    //   'biofuel_consumption': 'Japan',
    //   'fossil_fuel_consumption': 'Saudi Arabia',
    //   'coal_consumption': 'Vietnam',
    //   'gas_consumption': 'Brazil',
    //   'hydro_consumption': 'Indonesia',
    //   'low_carbon_consumption': 'Venezuela',
    //   'nuclear_consumption': 'Canada',
    //   'oil_consumption': 'India',
    //   'renewables_consumption': 'Argentina',
    //   'solar_consumption': 'Russia',
    //   'wind_consumption': 'South Africa',
    //   'other_renewable_consumption': 'Sweden',
    // };

    // function updateCountryAnnotation(svg, selectedEnergyType, geojsonData) {
    //   const countryName = energyTypeToCountry[selectedEnergyType];

    //   // Find the GeoJSON feature for the country
    //   const countryFeature = geojsonData.features.find(feature => feature.properties.name === countryName);

    //   // Calculate the centroid of the country feature
    //   const centroid = pathGenerator.centroid(countryFeature);

    //   // Define the start point for the annotation (somewhere above Antarctica)
    //   const startPoint = [width / 2, height - 200]; // Adjust this point as needed

    //   // Clear any existing annotations
    //   svg.selectAll(".country-annotation-group").remove();

    // Create a group for the annotation
    // const annotationGroup = svg.append("g")
    //   .attr("class", "country-annotation-group");

    // Text for the annotation based on the selected energy type
    // const annotationText = `See how ${countryName}'s energy profile changes`;

    // // Create the text at the start point
    // annotationGroup.append("text")
    //   .attr("x", startPoint[0])
    //   .attr("y", startPoint[1])
    //   .attr("fill", "white")
    //   .attr("font-family", "Roboto, sans-serif")
    //   .attr("font-size", "16px")
    //   .attr("text-anchor", "middle") // Center the text
    //   .text(annotationText);

    // Define the path for the curved arrow
    // annotationGroup.append("path")
    //   .attr("d", `M ${startPoint[0]} ${startPoint[1]}
    //               Q ${(startPoint[0] + centroid[0]) / 2} ${height + 100},
    //               ${centroid[0]} ${centroid[1]}`)
    //   .attr("fill", "none")
    //   .attr("stroke", "white")
    //   .attr("stroke-width", 2);

    // // Add an arrow marker to the path
    // annotationGroup.append("path")
    //   .attr("d", `M ${centroid[0]} ${centroid[1]}
    //               L ${centroid[0] - 5} ${centroid[1] - 10}
    //               L ${centroid[0] + 5} ${centroid[1] - 10}
    //               Z`)
    //   .attr("fill", "white");
    // }

    d3.select("#energy-type").on("change", function () {
      const selectedEnergyType = this.value;
      updateColorScaleAndLegend(globalEnergyData, selectedEnergyType);
      const selectedYear = parseInt(
        document.getElementById("year-slider").value,
        10,
      );
      updateMap(globalEnergyData, selectedYear); // Update the map based on the new energy type.
      // updateAnnotation(svg, selectedEnergyType);
      // updateCountryAnnotation(svg, selectedEnergyType, geojsonData);
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
  <h1 class="title">PowerAtlas: Navigating Global Energy Consumption</h1>
  <div id="controls-container">
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
    <input type="range" id="year-slider" min="1967" max="2021" value="2021" />
    <span>YEAR: </span>
    <span id="year-label">2021</span>
    <label for="country-name">Highlight Country:</label>
    <input
      type="text"
      id="country-name"
      name="country-name"
      placeholder="Type a country name"
    />
  </div>
  <div
    id="line-chart-container"
    style="position: absolute; visibility: hidden; width: 300px; height: 200px; background-color: white; border: 1px solid #ccc; pointer-events: none;"
  ></div>
  <div id="map"></div>
  <div id="para">
    <p>YAP</p>
  </div>
</main>

<style>
  .title {
    text-align: center;
    margin: 0;
    padding: 10px;
    background-color: black;
    color: white;
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
    flex-direction: column;
    height: 100vh;
    background-color: rgb(20, 20, 20);
    font-family: "Roboto", sans-serif;
    font-weight: 500;
  }

  #map {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    width: 80%;
    height: auto; /* Adjust based on content */
    margin: 0 auto;
    background-color: rgb(35, 35, 35);
  }

  #controls-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px; /* Adjust the space between the controls */
    margin: 20px auto;
    color: white;
  }

  #energy-type {
    padding: 5px 10px;
    background-color: #83aff0;
    color: black;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-family: "Roboto", sans-serif;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    margin-right: 10px;
    text-align: center;
  }

  #year-slider {
    -webkit-appearance: none;
    width: 200px; /* Fixed width or use a percentage */
    margin: 0 10px;
    height: 15px;
    background: #4d4d4d;
    border-radius: 7.5px;
    outline: none;
  }

  #year-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 25px;
    height: 25px;
    background: #83aff0;
    cursor: pointer;
    border-radius: 50%;
  }

  #year-label {
    margin-left: 0; /* Align with the slider */
  }

  #para {
    color: white;
  }

  .country.highlighted {
    fill: yellow !important; /* Use a bright color for testing */
    stroke: red !important;
    stroke-width: 2px !important;
  }
</style>
