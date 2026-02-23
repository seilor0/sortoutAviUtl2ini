import ButtonCssIcon from "./button-css-icon.js";
const { ref, computed } = Vue

export default {
  name: 'TreeItem',
  props: {
    model: Object,
    setting: Object,
    fileClickFunc: Function,
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

    const fileStyle = computed(() => {
      const previewFontFlag = props.setting.previewFont.enabled && props.setting.type==='Font';
      if (!previewFontFlag) return null;
      else {
        const addStyle = {
          fontSize : props.setting.previewFont.fontSize + 'rem',
          fontFamily : [
            props.model.fontStyle.fontFamily, 
            props.setting.previewFont.defFontFamily
          ].filter(Boolean).join(','), 
        };
        return [props.model.fontStyle, addStyle];
      }
    });

    // const ctrlKey = ref(null);
    const altKey = ref(null);
    const shiftKey = ref(null);

    function recordModifierKeyFlag (e) {
      // ctrlKey.value = e.ctrlKey;
      altKey.value = e.altKey;
      shiftKey.value = e.shiftKey;
    }
    function clearModifierKeyFlag () {
      // ctrlKey.value = null;
      altKey.value = null;
      shiftKey.value = null;
    }

    function ungroupFolder (model, parentArray, index) {
      parentArray.splice(index, 1, ...model.children);
    }

    function sortTreeData (targetArr, recursive=false) {
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

      if (recursive) {
        targetArr
          .filter (model => model.children)
          .forEach(model => sortTreeData(model.children, true));
      }
    }

    function toggleDetails (status, model, parentArr=[], includeSiblings=false, includeDecendants=false, isStart=false) {
      model.isOpen = status;
      // siblings
      if (includeSiblings) {
        parentArr
          .filter(sibling=>sibling.children)
          .forEach(sibling=>toggleDetails(status, sibling, parentArr, false, includeDecendants, false));
      }
      // decendants
      if (includeDecendants) {
        model.children
          .filter(child=>child.children)
          .forEach(child=>toggleDetails(status, child, model.children, false, includeDecendants, false));
      }
      if (isStart) clearModifierKeyFlag();
    }

    return {
      isFolder,
      fileStyle,
      // ctrlKey,
      altKey,
      shiftKey,
      ungroupFolder,
      sortTreeData,
      toggleDetails,
      recordModifierKeyFlag,
    }
  },
  template: `
  <details v-if="isFolder" class="folder" draggable="true" :open="model.isOpen"
   @toggle="toggleDetails($event.currentTarget.open, model, parentArray, shiftKey, altKey, true)">
    <summary @click="recordModifierKeyFlag">
      <span class="material-symbols-outlined hover">drag_indicator</span>
      <div @click.stop.prevent>
        <input type="text" v-model="model.name" />
        <span class="material-symbols-outlined" @click="sortTreeData(model.children, $event.altKey)">sort</span>
        <button-css-icon icon-name="icon-close" @click="ungroupFolder(model, parentArray, index)"></button-css-icon>
      </div>
    </summary>
    <div class="folder-body">
      <tree-item v-for="(childModel, index) in model.children" 
        :model="childModel"
        :setting="setting"
        :file-click-func="fileClickFunc"
        :parent-array="model.children" 
        :index="index"
      ></tree-item>
    </div>
  </details>

  <p v-else v-if="!model.toDelete" draggable="true"
    class="file" :class="{hide: model.props.hide}" :style="fileStyle"
    @click="fileClickFunc(model)">
    <span class="material-symbols-outlined hover">drag_indicator</span>{{model.name}}
  </p>
  `
}
