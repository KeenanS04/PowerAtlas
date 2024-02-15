<script>
    import { onMount } from "svelte";
    import * as d3 from "d3";

    let tempData = [];

    onMount(async () => {
        const res = await fetch("energy.csv");

        const csv = await res.text();

        tempData = d3.csvParse(csv, d3.autoType);

        console.log(tempData);
    });

</script>

<main>
    <h1>WorldEnergies</h1>
    <p>
        {#each tempData as d}
            <p>{d.country}</p>
        {/each}
    </p>
</main>
