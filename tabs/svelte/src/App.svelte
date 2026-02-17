<script lang="ts">
    import { onMount } from "svelte";
    import { ui } from "@joint/plus";
    import { Tabs, TabList, TabPanel, Tab } from "./components/tabs";
    import Graph from "./components/Graph.svelte";
    import { tabStore } from "./store";
    import "../node_modules/@joint/plus/joint-plus.css";

    let app;
    let tabs;

    tabStore.subscribe((store) => {
        tabs = store;
    });

    onMount(async () => {
        new ui.Tooltip({
            theme: "material",
            rootTarget: app,
            container: app,
            target: "[data-tooltip]",
            direction: ui.Tooltip.TooltipArrowPosition.Auto,
            position: ui.Tooltip.TooltipPosition.Top,
            padding: 10,
            animation: true,
        });
    });
</script>

<div bind:this={app} class="app">
    <Tabs>
        <TabList>
            {#each tabs as tab}
                <Tab title={tab.title}>
                    {tab.title}
                </Tab>
            {/each}
        </TabList>
        {#each tabs as tab, i}
            <TabPanel>
                <Graph {tabs} index={i} />
                <h2 class="tabs-title">{tab.title}</h2>
            </TabPanel>
        {/each}
    </Tabs>
</div>

<style>
</style>
