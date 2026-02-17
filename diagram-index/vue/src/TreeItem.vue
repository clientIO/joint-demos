<script lang="ts" setup>
import { ref, watch, toRefs } from 'vue';
import { dia } from '@joint/plus';
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue';

interface Child {
  id: string,
  name: string,
  isElement: boolean,
}

const props = defineProps<{
  id: string,
  activeId: string,
  title: string,
  children: Child[],
  graph: dia.Graph
}>();

const emit = defineEmits<{
  (e: 'activeItemChange', id: string, graph: dia.Graph): void
}>();

const isExpanded = ref(false);

const { activeId } = toRefs(props);

const result = props.children.some(child => child.id.includes(activeId.value))
if (result) {
  isExpanded.value = true;
  emit('activeItemChange', activeId.value, props.graph);
}

watch(activeId, (newVal) => {
  const result = props.children.some(child => child.id.includes(newVal))
  if (result) isExpanded.value = true;
});


const onClick = (id: string) => {
  if (!id.includes('-')) isExpanded.value = !isExpanded.value;

  emit('activeItemChange', id, props.graph);
};
</script>

<template>
  <div class="node-wrapper">
    <div class="diagram interactive" :class="{'active-item': props.activeId === props.id}" @click="() => onClick(props.id)">
      <ChevronRight :size="18" class="chevron" :class="{'expanded': isExpanded}" />
      <div class="diagram-title">{{ props.title }}</div>
    </div>
    <div class="children" :class="{'expanded': isExpanded}">
      <div v-for="{ id, name, isElement } in props.children" class="child-row interactive" :class="{'active-item': props.activeId === id}" @click="() => onClick(id)">
        <div class="icon">{{ isElement ? '▱' : '⇢' }}</div>
        <div class="name">{{ name }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  .node-wrapper {
    & .interactive {
      cursor: pointer;
      max-width: 100%;

      &:not(.active-item):hover {
        background-color: rgba(0, 0, 0, 0.04);;
      } 
    }
  }

  .active-item {
    background-color: #08b081;
    color: white;
  }

  .diagram {
    width: 100%;
    padding-left: 8px;
    display: inline-block;
    display: flex;
    align-items: center;

    .chevron {
      transition: transform 0.25s ease-in-out;

      &.expanded {
      transform: rotate(90deg);
      }
    }

    .diagram-title {
      padding-left: 4px;
    }
  }

  .material-design-icon > * {
    vertical-align:text-top;
    text-align: left;
  }

  .children {
    max-height: 0;
    overflow: hidden;
    transition: max-height .5s ease-in-out;
    margin-left: 16px;
    display: flex;
    flex-direction: column;

    .child-row {
      display: flex;
    } 

    &.expanded {
      max-height: 300px;
    }

    .icon {
      padding-left: 8px;
      vertical-align: middle;
    }

    .name {
      padding-left: 8px;
    }
  }
</style>
