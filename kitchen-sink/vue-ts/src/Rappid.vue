<template>
  <div id="app" class="joint-app">
    <div class="app-header">
      <img src="/assets/icons/joint-js.svg" alt="JointJS" />
    </div>
    <div ref="toolbarContainer" class="toolbar-container"></div>
    <div class="app-body">
      <div ref="stencilContainer" class="stencil-container"></div>
      <div ref="paperContainer" class="paper-container"></div>
      <div ref="inspectorContainer" class="inspector-container">
        <div ref="inspectorHeader" class="inspector-header hidden">
          <button ref="openGroupsButton" class="open-groups-btn"></button>
          <button ref="closeGroupsButton" class="close-groups-btn"></button>
          <span class="inspector-header-text">Properties</span>
        </div>
        <div ref="inspectorContent" class="inspector-content"></div>
      </div>
      <div ref="navigatorContainer" class="navigator-container"></div>
    </div>
  </div>
</template>

<script lang="ts">

import { Vue, Component, Ref } from 'vue-property-decorator';

// import rappid services
import RappidService from "./services/kitchensink-service";
import { StencilService } from "./services/stencil-service";
import { ToolbarService } from "./services/toolbar-service";
import { InspectorService } from "./services/inspector-service";
import { HaloService } from "./services/halo-service";
import { KeyboardService } from "./services/keyboard-service";
import { NavigatorService } from './services/navigator-service';

import { sampleGraphs } from './config/sample-graphs';

@Component
export default class Rappid extends Vue {
  @Ref('app') readonly app!: HTMLElement
  // Containers
  @Ref('paperContainer') readonly paperContainer!: HTMLElement
  @Ref('stencilContainer') readonly stencilContainer!: HTMLElement
  @Ref('toolbarContainer') readonly toolbarContainer!: HTMLElement
  @Ref('inspectorContainer') readonly inspectorContainer!: HTMLElement
  @Ref('navigatorContainer') readonly navigatorContainer!: HTMLElement
  // Additional inspector elements
  @Ref('openGroupsButton') readonly openGroupsButton!: HTMLButtonElement
  @Ref('closeGroupsButton') readonly closeGroupsButton!: HTMLButtonElement
  @Ref('inspectorHeader') readonly inspectorHeader!: HTMLDivElement
  @Ref('inspectorContent') readonly inspectorContent!: HTMLElement

  rappid: RappidService;

  mounted() {
    const services = {
      stencilService: new StencilService(this.stencilContainer),
      toolbarService: new ToolbarService(this.toolbarContainer),
      inspectorService: new InspectorService({
        openGroupsButton: this.openGroupsButton,
        closeGroupsButton: this.closeGroupsButton,
        container: this.inspectorContainer,
        header: this.inspectorHeader,
        content: this.inspectorContent
      }),
      haloService: new HaloService(),
      keyboardService: new KeyboardService(),
      navigatorService: new NavigatorService(this.navigatorContainer)
    }

    this.rappid = new RappidService(
      this.app,
      this.paperContainer,
      services
    );

    this.rappid.startRappid();

    this.rappid.graph.fromJSON(JSON.parse(sampleGraphs.emergencyProcedure), { ignoreUndoRedo: true });
  }
}
</script>

<style lang="scss">
// import rappid styles
@import "~@joint/plus/joint-plus.css";
// import custom styles
@import "../css/styles";
</style>
