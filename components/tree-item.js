import ButtonCssIcon from "./button-css-icon.js";
const { computed } = Vue

export default {
  name: 'TreeItem', // necessary for self-reference
  props: {
    model: Object,
    fileClickFunc: Function,
  },
  components: {
    ButtonCssIcon,
  },
  emits: [
    'folder-name-change',
    // 'file-click',
  ],
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
        <input type="text" :value="model.name"
          @change="(e)=>$emit('folder-name-change', e.currentTarget.value)" />
        <button-css-icon icon-name="icon-close"></button-css-icon>
      </div>
    </summary>
    <div class="folder-body">
      <tree-item v-for="model in model.children" :model="model" :file-click-func="fileClickFunc"></tree-item>
    </div>
  </details>

  <p v-else class="file" :class="{hide: model.hide}" draggable="true" @click="fileClickFunc(model.name)">
    <span class="material-symbols-outlined hover">drag_indicator</span>
    {{model.name}}
  </p>
  `
}
