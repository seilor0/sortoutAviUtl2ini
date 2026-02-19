import buttonCssIcon from "./button-css-icon.js";
const { computed } = Vue

export default {
  name: 'TreeItem', // necessary for self-reference
  props: {
    model: Object
  },
  components: {
    buttonCssIcon,
  },
  setup(props) {
    const isFolder = computed(() => props.model.children ? true : false);
    return {
      isFolder,
    }
  },
  template: `
  <details class="folder" draggable="true" :open="true" v-if="isFolder">
    <summary>
      <span class="material-symbols-outlined hover">drag_indicator</span>
      <div>
        <input type="text" v-model="model.name"/>
        <button-css-icon icon-name="icon-close"></button-css-icon>
      </div>
    </summary>
    <div class="folder-body">
      <tree-item v-for="model in model.children" :model="model"></tree-item>
    </div>
  </details>

  <p class="file" draggable="true" v-if="!isFolder">
    <span class="material-symbols-outlined hover">drag_indicator</span>
    {{model.name}}
  </p>
  `
}
