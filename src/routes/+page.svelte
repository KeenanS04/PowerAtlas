<script>
  import * as d3 from "d3";
  import { onMount } from "svelte";

  onMount(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    let geojsonData;
    let globalEnergyData;
    function wrap(text, width) {
      text.each(function () {
        var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1,
          y = text.attr("y"),
          x = text.attr("x"),
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
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
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
      .attr("height", "100vh")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg
      .append("text")
      .attr("class", "text-group")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", "22px")
      .text(
        "Hover over each country to see the % change in that countries energy consumption",
      );

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

    const projection = d3
      .geoNaturalEarth1()
      .translate([width / 2, height / 2])
      .scale(width / 2 / Math.PI);

    const pathGenerator = d3.geoPath().projection(projection);

    const colorScale = d3
      .scaleThreshold()
      .domain([0, 10.61, 69.34, 345.49, 44275.91])
      .range(["#7474b0", "#83aff0", "#4779c4", "#3c649f", "#2c456b"]);


    const legendData = colorScale.range().map((color) => {
      const d = colorScale.invertExtent(color);
      if (d[0] == null) d[0] = colorScale.domain()[0];
      if (d[1] == null) d[1] = colorScale.domain()[1];
      return d;
    });
    console.log(legendData);

    const legend = svg
      .append("g")
      .attr("id", "legend")
      .attr("transform", `translate(${50}, ${height - 300})`);

    function updateColorScaleAndLegend(energyData, selectedEnergyType) {
      const energyValues = energyData
        .map((d) => +d[selectedEnergyType])
        .filter((val) => !isNaN(val) && val !== 0);

      const quantileSteps = 5;
      const quantiles = [];
      for (let i = 1; i <= quantileSteps; i++) {
        quantiles.push(
          d3.quantile(energyValues.sort(d3.ascending), i / quantileSteps),
        );
      }

      colorScale.domain(quantiles);

      updateLegend(colorScale);
    }

    function updateLegend(colorScale) {
      const legend = svg.select("#legend");

      let legendData = colorScale.range().map((color, i) => {
        const extent = colorScale.invertExtent(color);
        if (i === 0 && extent[0] == null) {
          extent[0] = 0;
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

      legendRects.exit().remove();

      legendRects
        .enter()
        .append("rect")
        .attr("class", "legend-color-rect")
        .merge(legendRects)
        .attr("x", 0)
        .attr("y", (d, i) => i * legendItemHeight)
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", (d) => colorScale(d[0]));

      const legendTexts = legend.selectAll(".legend-text").data(legendData);

      legendTexts.exit().remove();

      legendTexts
        .enter()
        .append("text")
        .attr("class", "legend-text")
        .merge(legendTexts)
        .attr("x", 30)
        .attr("y", (d, i) => i * legendItemHeight + 15)
        .text((d) => `${d[0].toFixed(2)} - ${d[1].toFixed(2)}`);
    }

    const legendItems = legendData.length;
    const legendItemHeight = 30;
    const legendWidth = 250;
    const legendHeight = legendItems * legendItemHeight + 30;

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

    legend
      .selectAll(".legend-text")
      .data(legendData)
      .enter()
      .append("text")
      .attr("class", "legend-text")
      .attr("x", 30)
      .attr("y", (d, i) => i * legendItemHeight + 15)
      .text((d) => `${d[0].toFixed(2)} - ${d[1].toFixed(2)}`);

    legend
      .append("text")
      .attr("x", 0)
      .attr("y", -10)
      .text("Energy Consumption (TWh)")
      .attr("font-weight", "bold");

    const initialScale = 1;
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);

        const isInitialScale = event.transform.k === initialScale;

        svg
          .selectAll(".text-group")
          .style("display", isInitialScale ? null : "none");
      });

    svg.call(zoom);

    svg.on("wheel", (event) => {
      event.preventDefault();
    });

    Promise.all([
      d3.json("custom.geo.json"),
      d3.csv("energy_filtered.csv"),
    ]).then(([data, energyData]) => {
      geojsonData = data;
      globalEnergyData = energyData;
      const initialYear = 2021;
      const initialEnergyType = "primary_energy_consumption";
      updateColorScaleAndLegend(globalEnergyData, initialEnergyType);
      updateMap(globalEnergyData, initialYear);
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
        if (i === 0) return { year: d.year, value: 0 };
        const prevValue = +arr[i - 1][energyType];
        const currentValue = +d[energyType];
        const percentChange = ((currentValue - prevValue) / prevValue) * 100;

        return { year: d.year, value: percentChange };
      });

      return percentChanges;
    }

    function calculateTotalLineChartData(selectedYear, energyType, energyData) {
      if (!Array.isArray(energyData)) {
        console.error("energyData is not an array", energyData);
        return [];
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
          value: ((d.value - startValue) / startValue) * 100,
        }));
      } else {
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
      container.html("");

      const margin = { top: 50, right: 30, bottom: 70, left: 70 },
        width = 400 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

      const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "white")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      svg
        .append("rect")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("x", -margin.left)
        .attr("y", -margin.top)
        .attr("fill", "white");

      const combinedData = lineChartData.concat(totalLineChartData);

      let xDomain = d3.extent(combinedData, (d) => d.year);

      if (xDomain.length < 5) {
        xDomain = [selectedYear - 2, selectedYear + 2];
      }

      const yDomain = [
        d3.min(combinedData, (d) => d.value),
        d3.max(combinedData, (d) => d.value),
      ];

      const x = d3.scaleLinear().domain(xDomain).range([0, width]);
      const y = d3.scaleLinear().domain(yDomain).range([height, 0]).nice();


      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Percent Change (%)");

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
        .attr("stroke", "orange")
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
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));

      svg.append("g").call(d3.axisLeft(y));

      const legendPadding = 10;
      const legendMargin = 20;

      const legendX = width - 340;
      const legendY = height + 25;

      const lineChartLegend = svg
        .append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

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

      lineChartLegend
        .append("rect")
        .attr("x", 0)
        .attr("y", 20)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", "orange");

      lineChartLegend
        .append("text")
        .attr("x", 20)
        .attr("y", 30)
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
          d3.select(this).style("opacity", 0.5).style("stroke-width", 2);
          const countryName = d.properties.name;
          showLineChart(countryName, selectedYear);

          const chartContainer = document.getElementById(
            "line-chart-container",
          );
          const chartWidth = chartContainer.offsetWidth;
          const chartHeight = chartContainer.offsetHeight;
          const pageX = event.pageX;
          const pageY = event.pageY;
          const mapBounds = pathGenerator.bounds(geojsonData);
          const mapWidth = mapBounds[1][0] - mapBounds[0][0];
          const mapHeight = mapBounds[1][1] - mapBounds[0][1];

          let left =
            pageX + 10 + chartWidth > mapWidth
              ? pageX - chartWidth - 90
              : pageX + 15;
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
          d3.select(this).style("opacity", 1).style("stroke-width", 0.5);
          d3.select("#line-chart-container").style("visibility", "hidden");
        });
    }
    
    function highlightCountry(countryName, svg, geojsonData) {
      const normalizedCountryName = countryName.trim().toLowerCase();
      const selectedYear = parseInt(document.getElementById("year-slider").value, 10);
      const selectedEnergyType = document.getElementById("energy-type").value;
      const units = "TWh";

      svg
        .selectAll("path.country")
        .attr("fill", (d) => colorScale(d.properties.energy) || "#ccc")
        .attr("stroke", "white")
        .attr("stroke-width", 0.5);

      svg.selectAll("text.energy-consumption").remove();

      svg.selectAll("path.country").each(function (d) {
        const dataCountryName = d.properties.name.trim().toLowerCase();
        if (dataCountryName === normalizedCountryName) {
          d3.select(this)
            .attr("fill", "#FFAE42")
            .attr("stroke-width", 2);

          const textSelection = svg.append("text")
            .attr("class", "energy-consumption")
            .attr("x", width / 2 - 400)
            .attr("y", 60)
            .text(`The ${selectedEnergyType} for ${countryName} in ${selectedYear} is: ${d.properties.energy} ${units}`)
            .style("fill", "#FFAE42")
            .style("font-size", "20px");
        }
      });
    }
    
    d3.select("#country-name").on("input", function () {
      const typedName = d3.select(this).property("value");
      highlightCountry(typedName, svg, geojsonData);
    });
    d3.select("#energy-type").on("change", function () {
      const selectedEnergyType = this.value;
      updateColorScaleAndLegend(globalEnergyData, selectedEnergyType);
      const selectedYear = parseInt(
        document.getElementById("year-slider").value,
        10,
      );
      updateMap(globalEnergyData, selectedYear);
    });

    d3.select("#year-slider").on("input", function (event) {
      const currentYear = parseInt(event.target.value, 10);
      document.getElementById("year-label").textContent = currentYear;
      updateMap(globalEnergyData, currentYear);
    });
  });
</script>

<main>
  <h1 class="title">PowerAtlas: Navigating Global Energy Consumption</h1>
  <div id="para">
    <p>
      Welcome to a captivating exploration of the world's energy consumption
      history. Here, you'll journey through time, uncovering the shifts and
      trends in energy use across the globe. Begin by selecting an energy type,
      then navigate the years or dive into a specific country's story. Discover
      the changes, compare them to global trends, and gain a deeper
      understanding of our energy landscape. <br /><br />
      <strong>Pro Tip:</strong> Trace the evolution of energy patterns and focus
      on a country to see its unique energy tale unfold. Let's embark on this enlightening
      adventure together.
    </p>
  </div>
  <div id="controls-container">
    <div class="control-block">
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
    <div class="control-block">
      <span>YEAR: </span>
      <span id="year-label">2021</span>
      <input type="range" id="year-slider" min="1967" max="2021" value="2021" />
    </div>
    <div class="control-block">
      <label for="country-name">Highlight Country:</label>
      <input
        type="text"
        id="country-name"
        name="country-name"
        placeholder="Type a country name"
      />
    </div>
  </div>
  <div
    id="line-chart-container"
    style="position: absolute; visibility: hidden; width: 300px; height: 200px; background-color: white; border: 1px solid #ccc; pointer-events: none;"
  ></div>
  <div>
    <div id="map"></div>
  </div>
</main>

<style>
  .title {
    text-align: center;
    margin: 0;
    padding: 10px;
    background-color: black;
    color: white;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro",
      monospace;
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
    font-family: "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro", monospace;
    font-weight: 500;
    max-height: 100vh;
    overflow: auto;
  }

  #map {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    width: 80%;
    height: 80%;
    margin: 0 auto;
    background-color: rgb(35, 35, 35);
    border: 1px solid #ccc;
  }

  #controls-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin: 20px auto;
    color: white;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro",
      monospace;
  }

  .control-block {
    background-color: #34495e;
    padding: 15px;
    border-radius: 7px;
  }

  #energy-type {
    padding: 5px 10px;
    background-color: #83aff0;
    color: black;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro",
      monospace;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    margin-right: 10px;
    text-align: center;
  }

  #country-name {
    padding: 5px 10px;
    background-color: #83aff0;
    color: black;
    border-radius: 5px;
    border: 1px solid black;
    cursor: pointer;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro",
      monospace;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    margin-right: 10px;
    text-align: center;
  }

  #year-slider {
    -webkit-appearance: none;
    width: 200px;
    margin: 0 10px;
    height: 15px;
    background: lightgray;
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
    margin-left: 0;
  }

  #para {
    color: #f5f5f5;
    background-color: #333;
    padding: 20px;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro",
      monospace;
    font-size: 16px;
    line-height: 1.6;
    border-radius: 5px;
    margin: 20px auto;
    max-width: 80%;
  }

  #para p {
    margin: 0;
  }

  #para strong {
    color: #ffffff;
  }
</style>
