<script lang="ts" setup>
import TreeItem from './TreeItem.vue';
import { dia } from '@joint/plus';

interface Diagram {
  id: string,
  name: string,
  graph: dia.Graph,
  nodes: {
    id: string,
    name: string,
    isElement: boolean,
  }[]
}

const props = defineProps<{
  data: Diagram[],
  activeId: string
}>();

const emit = defineEmits<{
  (e: 'activeItemChange', id: string, graph: dia.Graph): void
}>();

const activeItemChange = (id: string, graph: dia.Graph) => emit('activeItemChange', id, graph);
</script>

<template>
  <div class="wrapper">
    <TreeItem v-for="{ id, name, nodes, graph } in props.data" :id="id" :title="name" :children="nodes" :graph="graph" :activeId="props.activeId" @active-item-change="activeItemChange" />
  </div>
</template>

<style lang="scss">
  @import "~@joint/plus/joint-plus.css";

  .wrapper {
    min-width: 200px;
    width: 25%;
    height: 100vh;
    border-right: 1px solid #E2E2E2;
    background-color: #F5F5F5;
  }
</style>
