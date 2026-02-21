import ButtonCssIcon from "./button-css-icon.js";
const { computed } = Vue

export default {
  name: 'TreeItem',
  props: {
    model: Object,
    fileClickFunc: Function,
    sortBtnClickFunc: Function,
    xBtnClickFunc: Function,
    parentArray: Array,
    index: Number,
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
        <span class="material-symbols-outlined"
         @click.prevent="sortBtnClickFunc(model.children)"
        >sort</span>
        <button-css-icon icon-name="icon-close"
         @click="xBtnClickFunc(model, parentArray, index)"
        ></button-css-icon>
      </div>
    </summary>
    <div class="folder-body">
      <tree-item v-for="(childModel, index) in model.children" :model="childModel"
       :file-click-func="fileClickFunc"
       :sort-btn-click-func="sortBtnClickFunc"
       :x-btn-click-func="xBtnClickFunc" :parent-array="model.children" :index="index"
      ></tree-item>
    </div>
  </details>

  <p v-else v-if="!model.toDelete" class="file" :class="{hide: model.props.hide}" draggable="true" @click="fileClickFunc(model)">
    <span class="material-symbols-outlined hover">drag_indicator</span>
    {{model.name}}
  </p>
  `
}
