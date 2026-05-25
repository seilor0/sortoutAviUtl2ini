import ButtonCssIcon from "./button-css-icon.js";
import GoogleIcon from './google-icon.js';

const { computed, toRaw } = Vue

export default {
  name: 'TreeItem',
  props: {
    model: Object,
    parentArray: Array,
    index: Number,

    insertTarget: Array,
    insertItems: Array,

    setting: Object,
    dragData: Object,
  },

  components: {
    ButtonCssIcon,
    GoogleIcon,
  },

  setup(props, {emit}) {
    const packageStyle = computed(() => {
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

    const treeItemClass = computed(() => {
      const targetFlag = 
        props.dragData.startModel === null &&
        props.insertTarget.at(-1)?.parent === props.parentArray && 
        props.insertTarget.at(-1)?.index === props.index;

      return {
        target: targetFlag, 
        choice: props.insertItems.some(dic=>dic.model===props.model)
      }
    });

    const folderBodyClass = computed(() => {
      const targetFlag = 
        props.model.children.length === 0 &&
        props.insertTarget.at(-1)?.parent === props.model.children;

      const targetDownFlag = 
        props.model.children.length &&
        props.insertTarget.at(-1)?.parent === props.model.children && 
        props.insertTarget.at(-1)?.index === props.model.children.length;

      return { 'target': targetFlag, 'target-down': targetDownFlag, };
    });


    function ungroupFolder (model, parentArray, index) {parentArray.splice(index, 1, ...model.children);}

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

    function toggleDetails (status, model, parentArray=[], includeSiblings=false, includeDecendants=false) {
      model.isOpen = status;
      // siblings
      if (includeSiblings) {
        parentArray
          .filter(sibling=>sibling.children)
          .forEach(sibling=>toggleDetails(status, sibling, parentArray, false, includeDecendants));
      }
      // decendants
      if (includeDecendants) {
        model.children
          .filter(child=>child.children)
          .forEach(child=>toggleDetails(status, child, model.children, false, includeDecendants));
      }
    }

    function addInsertModels () {
      if (props.insertItems.some(dic=>dic.model===props.model)) return;
      props.insertItems.push({model: props.model, parent: props.parentArray, index: props.index});
      // console.log('add: ', props.model.name);
    }
    
    function toggleInsertModels () {
      const i = props.insertItems.findIndex(dic=>dic.model===props.model);
      if (i > -1) props.insertItems.splice(i, 1);
      else {
        props.insertItems.push({model: props.model, parent: props.parentArray, index: props.index});
        // console.log('add: ', props.model.name)
      }
    }

    // -----------------------
    //     drag and click
    // -----------------------
    function mouseEnterExactToTreeItem (e) {
      if (!props.dragData.isDragging) return;
      props.insertTarget.push({parent: props.parentArray, index: props.index});
    }
    function mouseEnterCtrlToTreeItem (e) {
      if (!props.dragData.isDragging) return;
      addInsertModels();
    }
    function mouseEnterToFolderBody (e) {
      if (!props.dragData.isDragging) return;
      const bodyHeight = e.currentTarget.getBoundingClientRect().height;
      const index = e.offsetY > bodyHeight/2 ? props.model.children.length : 0;
      props.insertTarget.push({parent: props.model.children, index: index});
    }

    function mouseLeaveExactFromTreeItem (e) {
      if (!props.dragData.isDragging) return;
      props.insertTarget.pop();
      // folder-body or result-divがドロップ対象になるので、
      // indexをマウス位置に応じて修正
      const bodyRect = e.currentTarget.parentElement.getBoundingClientRect();
      const bodyCenter = (bodyRect.top + bodyRect.bottom) / 2;
      const index = e.pageY > bodyCenter ? props.parentArray.length : 0;
      props.insertTarget.at(-1).index = index;
      
      // start-modelが存在=初めての移動の場合、
      // drag-start相当の処理をする
      if (props.dragData.startModel) {
        if (!props.insertItems.length) {
          props.insertItems.push(props.dragData.startModel);
          console.log('add: ', props.dragData.startModel.model.name);
        }
        props.dragData.startModel = null;
      }
    }
    function mouseLeaveCtrlFromTreeItem (e) {
      if (!props.dragData.isDragging) return;
      addInsertModels();
      // start-modelが存在=初めての移動の場合、
      // drag-start相当の処理をする
      if (props.dragData.startModel) {
        if (!props.insertItems.some(dic=>dic.model===props.dragData.startModel.model)) {
          props.insertItems.push(props.dragData.startModel);
        }
        props.dragData.startModel = null;
      }
    }
    function mouseLeaveFromFolderBody (e) {
      if (!props.dragData.isDragging) return;
      props.insertTarget.pop();
    }

    function mouseDownTreeItem (e) {
      // drag-start要素を記憶
      if (props.dragData.startModel===null) {
        props.dragData.startModel = {model: props.model, parent: props.parentArray, index: props.index};
      }
    }
    function mouseDownExactTreeItem () {
      props.insertTarget.unshift({parent: props.parentArray, index: props.index});
    }
    function mouseDownFolderBody () {
      props.insertTarget.unshift({parent: props.model.children, index: 0});
    }

    // click相当
    function mouseUpExactTreeItem (e) {
      if (!props.dragData.isDragging) return;
      if (props.dragData.startModel?.model!==props.model) return;  
      // console.log('clicked tree-item', props.model);
      if (!props.model.children) {
        props.model.props.hide = 1-props.model.props.hide;
      }
    }
    function mouseUpCtrlTreeItem (e) {
      if (!props.dragData.isDragging) return;
      if (props.dragData.startModel?.model!==props.model) return;  
      // console.log('ctrl-clicked package', props.model);
      toggleInsertModels();
    }


    return {
      packageStyle,
      treeItemClass,
      folderBodyClass,
      
      ungroupFolder,
      sortTreeData,
      toggleDetails,

      mouseEnterExactToTreeItem,
      mouseEnterCtrlToTreeItem,
      mouseEnterToFolderBody,

      mouseLeaveExactFromTreeItem,
      mouseLeaveCtrlFromTreeItem,
      mouseLeaveFromFolderBody,

      mouseDownTreeItem,
      mouseDownExactTreeItem,
      mouseDownFolderBody,

      mouseUpExactTreeItem,
      mouseUpCtrlTreeItem,
    }
  },

  template: `
  <details v-if="Boolean(model.children)" :open="model.isOpen"
    class="folder" :class="treeItemClass"
    @mouseenter.exact="mouseEnterExactToTreeItem"
    @mouseenter.ctrl="mouseEnterCtrlToTreeItem"
    @mouseleave.exact="mouseLeaveExactFromTreeItem"
    @mouseleave.ctrl="mouseLeaveCtrlFromTreeItem"
    @mousedown="mouseDownTreeItem"
    @mousedown.exact="mouseDownExactTreeItem"
    @mouseup.exact="mouseUpExactTreeItem"
    @mouseup.ctrl="mouseUpCtrlTreeItem"
  >
    <summary @click.stop.prevent="if (!$event.ctrlKey) toggleDetails(!model.isOpen, model, parentArray, $event.shiftKey, $event.altKey);">
      <google-icon class="hover">drag_indicator</google-icon>
      <div>
        <span class="folder-name-wrap">
          <input type="text" v-model="model.name" class="folder-name" placeholder="グループ名を入力" @click.exact.stop />
        </span>
        <google-icon @click.stop.prevent="sortTreeData(model.children, $event.altKey)">sort</google-icon>
        <button-css-icon icon-name="icon-close" @click.stop.prevent="ungroupFolder(model, parentArray, index)"></button-css-icon>
      </div>
    </summary>
  
    <div class="folder-body" :class="folderBodyClass"
      @mouseenter.exact="mouseEnterToFolderBody"
      @mouseleave.exact="mouseLeaveFromFolderBody"
      @mousedown.exact="mouseDownFolderBody"
    >
      <tree-item v-for="(childModel, index) in model.children"
        :model="childModel"
        :parent-array="model.children"
        :index="index"
        :insert-target="insertTarget"
        :insert-items="insertItems"
        :setting="setting"
        :drag-data="dragData"
      ></tree-item>
    </div>
  </details>
  
  <p v-else v-if="!model.toDelete" class="package" :class="{hide: model.props.hide, ...treeItemClass}" :style="packageStyle"
    @mouseenter.exact="mouseEnterExactToTreeItem"
    @mouseenter.ctrl="mouseEnterCtrlToTreeItem"
    @mouseleave.exact="mouseLeaveExactFromTreeItem"
    @mouseleave.ctrl="mouseLeaveCtrlFromTreeItem"
    @mousedown="mouseDownTreeItem"
    @mousedown.exact="mouseDownExactTreeItem"
    @mouseup.exact="mouseUpExactTreeItem"
    @mouseup.ctrl="mouseUpCtrlTreeItem"
  >
    <google-icon class="hover">drag_indicator</google-icon>{{model.name}}
  </p>
  `
}
