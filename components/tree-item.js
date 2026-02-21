import ButtonCssIcon from "./button-css-icon.js";
const { computed } = Vue

export default {
  name: 'TreeItem',
  props: {
    model: Object,
    fileClickFunc: Function,
  },
  components: {
    ButtonCssIcon,
  },
  setup(props) {
    const isFolder = computed(() => props.model.children ? true : false);
    return {
      isFolder,
    }
  },
  template: `
  <details v-if="isFolder" class="folder" draggable="true" :open="true">
    <summary>
      <span class="material-symbols-outlined hover">drag_indicator</span>
      <div>
        <input type="text" v-model="model.name" />
        <button-css-icon icon-name="icon-close"></button-css-icon>
      </div>
    </summary>
    <div class="folder-body">
      <tree-item v-for="model in model.children" :model="model" :file-click-func="fileClickFunc"></tree-item>
    </div>
  </details>

  <p v-else v-if="!model.toDelete" class="file" :class="{hide: model.props.hide}" draggable="true" @click=fileClickFunc(model)>
    <span class="material-symbols-outlined hover">drag_indicator</span>
    {{model.name}}
  </p>
  `
}
