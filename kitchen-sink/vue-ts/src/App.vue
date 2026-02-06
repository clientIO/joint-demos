<template>
  <div id="app">
    <Rappid/>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Rappid from './Rappid.vue';
import Component from 'vue-class-component';

@Component({
  components: {
    Rappid
  }
})
export default class App extends Vue {

}
</script>

<style lang="scss">
  #app {
    height: 100%;
  }
</style>
