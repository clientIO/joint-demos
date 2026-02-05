<template>
    <Chatbot/>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

import Chatbot from './components/Chatbot/Chatbot.vue';

@Component({
    components: {
        Chatbot
    }
})
export default class App extends Vue {

}
</script>
