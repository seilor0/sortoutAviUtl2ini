import ButtonCssIcon from "./button-css-icon.js";
const { computed } = Vue

export default {
  name: 'TreeItem',
  props: {
    model: Object,
    setting: Object,
    fileClickFunc: Function,
    sortBtnClickFunc: Function,
    xBtnClickFunc: Function,
    parentArray: Array,
    index: Number,
  },

  // setting: {
  //   type,
  //   previewFont: {enabled:true, fontSize:1, defFontFamily:''},
  //   labelSort: {isAsc:true, style:'folderIsBottom'},
  // }

  components: {
    ButtonCssIcon,
  },
  setup(props) {
    const isFolder = computed(() => props.model.children ? true : false);

    function ungroupFolder (model, parentArray, index) {
      parentArray.splice(index, 1, ...model.children);
    }

    function sortTreeData (targetArr) {
      const sortStyle = props.setting.labelSort.style;
      const isAsc = props.setting.labelSort.isAsc ? 1 : -1;
      if (sortStyle==='folderIsMix')
        targetArr.sort((a,b) => isAsc * (a.name > b.name ? 1 : -1));
      
      if (sortStyle==='folderIsTop') {
        targetArr
          .sort((a,b) => isAsc * (a.name > b.name ? 1 : -1))
          .sort((a,b) => Boolean(a.children) > Boolean(b.children) ? -1 : 1);
          
        } else if (sortStyle==='folderIsBottom') {
        targetArr
          .sort((a,b) => isAsc * (a.name > b.name ? -1 : 1))
          .sort((a,b) => Boolean(a.children) > Boolean(b.children) ? 1 : -1);
      }
    }
    
    return {
      isFolder,
      ungroupFolder,
      sortTreeData,
    }
  },
  template: `
  <details v-if="isFolder" class="folder" draggable="true"
    :open="false" @toggle="toggleDetailFunc">
    <summary>
      <span class="material-symbols-outlined hover">drag_indicator</span>
      <div>
        <input type="text" v-model="model.name" />
        <span class="material-symbols-outlined" @click.prevent="sortTreeData(model.children)">sort</span>
        <button-css-icon icon-name="icon-close" @click="ungroupFolder(model, parentArray, index)"></button-css-icon>
      </div>
    </summary>
    <div class="folder-body">
      <tree-item v-for="(childModel, index) in model.children" :model="childModel"
        :setting="setting"
       :file-click-func="fileClickFunc"
        :toggle-detail-func="toggleDetailFunc"
        :parent-array="model.children" :index="index"
      ></tree-item>
    </div>
  </details>

  <p v-else v-if="!model.toDelete" class="file" :class="{hide: model.props.hide}" draggable="true" @click="fileClickFunc(model)">
    <span class="material-symbols-outlined hover">drag_indicator</span>
    {{model.name}}
  </p>
  `
}
