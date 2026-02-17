<script>
    import { getContext } from "svelte";
    import { TABS } from "./Tabs.svelte";

    const tab = {};
    const { registerTab, selectTab, removeTab, selectedTab } = getContext(TABS);

    registerTab(tab);

    /* 
        Props - Svelte convention is to use 'export let' for props
    */
    export let title;
</script>

<button
    class="btn"
    class:selected={$selectedTab === tab}
    on:click={() => selectTab(tab)}
>
    <slot />
    <button
        class="btn-remove"
        on:click={() => removeTab(tab)}
        data-tooltip={`Remove ${title} tab`}
        data-tooltip-position="top">x</button
    >
</button>

<style>
    .btn {
        background: none;
        display: inline-block;
        border: 1px solid transparent;
        border-bottom: none;
        bottom: -1px;
        position: relative;
        list-style: none;
        padding: 6px 12px;
        cursor: pointer;
    }

    .selected {
        background: #fff;
        border-color: #aaa;
        color: black;
        border-radius: 5px 5px 0 0;
    }
</style>
