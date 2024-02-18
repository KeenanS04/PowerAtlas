// Define width and height for the SVG
const width = 960;
const height = 600;
let globalEnergyData;
let geojsonData;

// Append SVG to the map container and set its size
const svg = d3.select('#map').append('svg')
    .attr('width', width)
    .attr('height', height);

// Create a map projection and path generator
const projection = d3.geoNaturalEarth1().scale(width / 2 / Math.PI).translate([width / 2, height / 2]);
const pathGenerator = d3.geoPath().projection(projection);

const colorScale = d3.scaleThreshold()
    .domain([10.61, 69.34, 345.49, 44275.91])
    .range(["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6"]);

// Load and draw the world map
d3.json('static/custom.geo.json').then(function(data) {
    // Load the energy data inside the GeoJSON callback
    geojsonData = data;
    d3.csv('static/energy_filtered.csv').then(function(energyData) {

        globalEnergyData = energyData;

        const energyDataMap = new Map();
        energyData.forEach(function(d) {
            energyDataMap.set(d.country, d);
        });
    

        data.features.forEach(function(feature) {
            const country = feature.properties.name; 
            const energy = energyDataMap.get(country);
            if (energy) {
                feature.properties.energy = energy;
            }
        });

        // Draw the map with the joined data
        svg.selectAll('path')
            .data(data.features)
            .join('path')
            .attr('d', pathGenerator)
            // Set fill based on energy data, with a fallback color if no data is present
            .attr('fill', function(d) {
                const energyValue = d.properties.energy ? +d.properties.energy.total_energy : null;
                return energyValue ? colorScale(energyValue) : 'blue';
        });
        updateMap(2022);
    }).catch(function(error) {
        console.error('Error loading the CSV data: ', error);
    });
}).catch(function(error) {
    console.error('Error loading the GeoJSON data: ', error);
});

d3.select("#year-slider").on("input", function(event) {
    updateMap(event.target.value);
});

function updateMap(selectedYear) {
    // Parse the selectedYear to ensure it's an integer
    selectedYear = parseInt(selectedYear, 10);
    // Filter the energy data based on the selected year
    const filteredData = globalEnergyData.filter(d => parseInt(d.year, 10) === selectedYear);
    
    // Create a map of country name to energy data for quick lookup
    const energyDataMap = new Map();
    filteredData.forEach(function(d) {
        energyDataMap.set(d.country, d);
    });
    
    // Check if geojsonData is loaded
    if (!geojsonData) {
        console.error('GeoJSON data is not yet loaded.');
        return; // Exit the function if data is not loaded
    }

    // Join the energy data to the GeoJSON features
    geojsonData.features.forEach(function(feature) {
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
    svg.selectAll('path')
        .data(geojsonData.features)
        .join('path')
        .attr('d', pathGenerator)
        .transition() // Animate color transition
        .duration(500)
        // Set fill based on energy data, with a fallback color if no data is present
        .attr('fill', function(d) {
            // Use the energy property for the color scale if it exists
            return d.properties.energy ? colorScale(d.properties.energy) : 'lightgray'; // Fallback color
        });
}