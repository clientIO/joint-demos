<script lang="ts" setup>
import { ref, shallowRef, onMounted, nextTick, triggerRef } from 'vue'
import { Tabs, Tab, TabPanels, TabPanel } from 'vue3-tabs';
import { TabsDataRaw } from './tabs-data';
import { dia, ui, shapes, util, g } from '@joint/plus';
import HyperlinkHighlighter from './hyperlink-highlighter';

interface TabData {
  title: string;
  graph:  dia.Graph,
  focusPoint?: g.PlainPoint
}

const app = ref(null);
const theme = 'material';

onMounted(() => {
  appendGraph(0);
  if (!app.value) return;

  new ui.Tooltip({
    theme,
    rootTarget: app.value,
    container: app.value,
    target: '[data-tooltip]',
    direction: ui.Tooltip.TooltipArrowPosition.Auto,
    position: ui.Tooltip.TooltipPosition.Top,
    padding: 10,
    animation: true
  });
});

const selectedTab = ref(0);
const tabsData = shallowRef<TabData[]>([]);
const panelRefs = ref<InstanceType<typeof TabPanel>[]>([]);

/**
 * Create default tab state
 */
tabsData.value = TabsDataRaw.map(({ title, json }) => {
  const graph = new dia.Graph({ id: util.uuid() }, { cellNamespace: shapes });
  graph.fromJSON(json);
  const focusPoint = graph.getBBox()?.center().toJSON();

  return {
    title,
    graph,
    focusPoint,
  }
});

const isTabActive = (index: number) => selectedTab.value === index;
/**
 * Remove a tab at the specified index
 */
const removeTab = (index: number) => {
  tabsData.value.splice(index, 1);
  triggerRef(tabsData);
}
/**
 * Add a new tab with placeholder content
 */
const addTab = () => {
  tabsData.value.push({
    title: `Tab ${tabsData.value.length + 1}`,
    graph: new dia.Graph({ id: util.uuid() }, { cellNamespace: shapes }),
  });

  const index = tabsData.value.length - 1;
  selectedTab.value = index;

  appendGraph(index);
}

const tabChanged = (currentTabIndex: number) => {
  if (currentTabIndex >= tabsData.value.length) {
    selectedTab.value = tabsData.value.length - 1;
    currentTabIndex = tabsData.value.length - 1;
  }
  appendGraph(currentTabIndex);
}

const selectGraph = (graphId: string) => {
  const index = tabsData.value.findIndex(({ graph }) => graph.id === graphId);
  if (index > -1) {
    selectedTab.value = index;
    appendGraph(index);
  } else {
    const message = new ui.FlashMessage({
      theme,
      content: `Invalid sub-process ID: ${graphId}`,
    });
    message.open();
  }
}

/**
 * Mounts the content of the tab and sets the focus point.
 */
const appendGraph = async (index: number) => {
  if (!tabsData.value.length) return;
  await nextTick();
  const currentTab = tabsData.value[index];

  const paper = new dia.Paper({
    model: tabsData.value[index].graph as dia.Graph,
    background: {
      color: '#F8F9FA',
    },
    frozen: true,
    async: true,
    gridSize: 10,
    cellViewNamespace: shapes,
    defaultConnectionPoint: {
      name: 'boundary'
    }
  });
  const scroller = new ui.PaperScroller({
    paper,
    baseWidth: 10,
    baseHeight: 10,
    autoResizePaper: true,
    contentOptions: {
      minWidth: 600,
      allowNewOrigin: 'any',
      allowNegativeBottomRight: true,
      useModelGeometry: true,
      padding: 100
    },
    cursor: 'grab'
  });


  const currentPanel = panelRefs.value.find((panel) => panel.$attrs.val === selectedTab.value);

  currentPanel.$el.appendChild(scroller.el);
  scroller.render().adjustPaper();

  paper.on('element:link', (elementView: dia.ElementView, evt: dia.Event) => {
    const { subgraphId } = elementView.model.attributes;
    if (!subgraphId) return;
    evt.stopPropagation();
    selectGraph(subgraphId);
  });

  paper.on('blank:pointerdown', (evt) => {
    scroller.startPanning(evt);
  });

  currentTab.graph.getElements().forEach((element) => {
    HyperlinkHighlighter.addToLabel(element, paper, 'subgraphId');
  });

  if (currentTab.focusPoint) {
    scroller.center(currentTab.focusPoint.x, currentTab.focusPoint.y);
  } else {
    scroller.center();
  }

  paper.unfreeze();
}
</script>

<template>
  <div class="wrapper" ref="app">
    <tabs v-model="selectedTab" @update:modelValue="tabChanged" class="tabs-wrapper">
      <tab v-for="(tab, i) in tabsData" :key='`tab-${i}`' :val="i" class="tab" :class="{ 'is-active': isTabActive(i) }">
        {{tab.title}}
        <button @click="() => removeTab(i)" class="remove-btn" :data-tooltip='`Remove "${tab.title}" tab`' data-tooltip-position="top">&#10060;</button>
      </tab>
      <button @click="addTab" class="add-btn" data-tooltip="Add a new tab" data-tooltip-position="top">+</button>
  </tabs>
  <tab-panels
    v-model="selectedTab"
  >
    <tab-panel
      v-for="(tab, i) in tabsData"
      :key="`panel-${i}`"
      :val="i"
      ref="panelRefs"
    >
        <h2>{{ tab.title }}</h2>
      </tab-panel>
    </tab-panels>
  </div>
</template>

<style lang="scss" src="./style.scss" />
