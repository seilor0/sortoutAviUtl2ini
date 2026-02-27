import ButtonCssIcon from "./button-css-icon.js";
const { computed, toRaw } = Vue

export default {
  name: 'TreeItem',
  props: {
    model: Object,
    setting: Object,
    parentArray: Array,
    index: Number,
    fileClickFunc: Function,

    insertTarget: Array,
    insertItems: Array,
    modifierKeyFlag: Object,
  },

  components: {ButtonCssIcon},
  emits: ['switch-tree-data'],

  setup(props, {emit}) {
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

    const treeItemClass = computed(() => {
      const targetFlag = 
        props.insertTarget[0]?.parent === props.parentArray && 
        props.insertTarget[0]?.index === props.index;

      return {
        target: targetFlag, 
        choice: props.insertItems.some(dic=>dic.model===props.model)
      }
    });

    const folderBodyClass = computed(() => {
      const targetFlag = 
        props.model.children.length === 0 &&
        props.insertTarget[0]?.parent === props.model.children;

      const targetDownFlag = 
        props.model.children.length &&
        props.insertTarget[0]?.parent === props.model.children && 
        props.insertTarget[0]?.index === props.model.children.length;

      return { 'target': targetFlag, 'target-down': targetDownFlag, };
    });


    function recordModifierKeyFlag (e) {
      // console.log('modifier key is recorded.');
      props.modifierKeyFlag.ctrl = e.ctrlKey;
      props.modifierKeyFlag.alt = e.altKey;
      props.modifierKeyFlag.shift = e.shiftKey;
    }

    function clearModifierKeyFlag () {
      // console.log('modifier key is cleared.');
      props.modifierKeyFlag.ctrl = null;
      props.modifierKeyFlag.alt = null;
      props.modifierKeyFlag.shift = null;
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
          .forEach(sibling=>toggleDetails(status, sibling, parentArr, false, includeDecendants));
      }
      // decendants
      if (includeDecendants) {
        model.children
          .filter(child=>child.children)
          .forEach(child=>toggleDetails(status, child, model.children, false, includeDecendants));
      }
      if (isStart) clearModifierKeyFlag();
    }


    function addInsertModels () {
      if (props.insertItems.some(dic=>dic.model===props.model)) return;
      props.insertItems.push({model: props.model, parent: props.parentArray, index: props.index});
      // console.log('add insert models');
    }
    
    function toggleInsertModels () {
      const i = props.insertItems.findIndex(dic=>dic.model===props.model);
      if (i > -1) props.insertItems.splice(i, 1);
      else props.insertItems.push({model: props.model, parent: props.parentArray, index: props.index});
      // console.log('toggle insert models');
    }

    function dragEnterToTreeItem () {
      props.insertTarget.push({parent: props.parentArray, index: props.index});
      // console.log('-------------');
      // console.log('enter - file / folder');
    }

    function dragEnterToEmptyFolderBody () {
      props.insertTarget.push({parent: props.model.children, index: 0});
      // console.log('-------------');
      // console.log('enter - empty-folder-body');
    }
    
    function dragEnterToFillFolderBody (e) {
      if (e.offsetY > e.currentTarget.getBoundingClientRect().height-8)
        props.insertTarget.push({parent: props.model.children, index: props.model.children.length});
      // console.log('-------------');
      // console.log('enter - fill-folder-body');
    }
    
    function dragLeave () {
      props.insertTarget.shift();
      // console.log('-------------');
      // console.log('leave', e.currentTarget);
    }
    
    function dragLeaveFromFillFolderBody () {
      const target = props.insertTarget[0];
      if (target?.parent===props.model.children && target?.index===props.model.children.length)
        props.insertTarget.shift();
      // console.log('-------------');
      // console.log('leave - fill-folder-body');
    }
    
    function drop () {
      console.log('-------------');
      console.log('drop for :', toRaw(props.insertTarget[0]));
      // console.log('insert items:', [...toRaw(props.insertItems)]);

      // フォルダに含まれている子要素をinsertItemsから削除
      deleteChildTreeItem(props.insertItems.map(item=>item.model));

      function deleteChildTreeItem (modelArr) {
        modelArr
          .filter(model => model.children)
          .forEach(model => {
            // modelの子modelがinsertModelsにあったら削除
            model.children.forEach(child => {
              const i = props.insertItems.findIndex(item=>item.model===child);
              if (i>-1) props.insertItems.splice(i,1);
              if (child.children) deleteChildTreeItem(child.children);
            });
          });
      }
      
      // 挿入アイテムのソート ... 選択順で追加されてしまうため
      props.insertItems
        .sort((a, b)=>{
          const aOrder = a.model.children ? a.model.order : a.model.props.order;
          const bOrder = b.model.children ? b.model.order : b.model.props.order;
          return aOrder - bOrder;
        });
        
      const target = props.insertTarget[0];
      const a = props.insertItems.filter(item=> item.parent === target.parent && item.index < target.index);

      // 大元アイテムの削除
      props.insertItems.forEach(item=>{
        if (!item.parent) return;
        const i = item.parent.findIndex(model=>model===item.model);
        item.parent.splice(i, 1);
      });

      // 挿入
      target.parent.splice(target.index-a.length, 0, ...props.insertItems.map(item=>item.model));
      
      // イベント発行 ... order更新のため
      // console.log('emit switch-tree-data event');
      emit('switch-tree-data');
    }

    function dragEnd () {
      // console.log('drag end', props.modifierKeyFlag.ctrl);
      if (!props.modifierKeyFlag.ctrl) {
        props.insertTarget.splice(0);
        props.insertItems.splice(0);
      }
      clearModifierKeyFlag();
    }


    return {
      fileStyle,
      treeItemClass,
      folderBodyClass,
      
      ungroupFolder,
      sortTreeData,
      toggleDetails,
      recordModifierKeyFlag,

      addInsertModels,
      toggleInsertModels,

      dragEnterToTreeItem,
      dragEnterToEmptyFolderBody,
      dragEnterToFillFolderBody,
      
      dragLeave,
      dragLeaveFromFillFolderBody,

      dragEnd,
      drop,
    }
  },

  template: `
  <details v-if="Boolean(model.children)" draggable="true" :open="model.isOpen"
    class="folder" :class="treeItemClass"
    @toggle="toggleDetails($event.currentTarget.open, model, parentArray, modifierKeyFlag.shift, modifierKeyFlag.alt, true)"
    @click.ctrl.stop.prevent="toggleInsertModels"
  
    @dragstart.exact.stop="addInsertModels"
    @dragstart.ctrl.stop="recordModifierKeyFlag"
    @dragend.stop="dragEnd"
    
    @dragenter.exact.stop="dragEnterToTreeItem"
    @dragleave.exact.stop="dragLeave"
    @dragenter.ctrl.stop="addInsertModels"
  
    @dragover.prevent
    @drop.exact.stop="drop"
  >
    
    <summary @click.alt="recordModifierKeyFlag" @click.shift="recordModifierKeyFlag">
      <span class="material-symbols-outlined hover">drag_indicator</span>
      <div>
        <input type="text" v-model="model.name" />
        <span class="material-symbols-outlined" @click.stop.prevent="sortTreeData(model.children, $event.altKey)">sort</span>
        <button-css-icon icon-name="icon-close" @click.stop.prevent="ungroupFolder(model, parentArray, index)"></button-css-icon>
      </div>
    </summary>
  
    <div class="folder-body" :class="folderBodyClass"
      @dragenter.exact.stop="model.children.length ? dragEnterToFillFolderBody($event) : dragEnterToEmptyFolderBody()"
      @dragleave.exact.stop="model.children.length ? dragLeaveFromFillFolderBody() : dragLeave()"
      @dragenter.ctrl.stop
      @dragover.prevent
      @drop.exact.stop="drop"
    >
      <tree-item v-for="(childModel, index) in model.children"
        :model="childModel"
        :setting="setting"
        :parent-array="model.children"
        :index="index"
        :file-click-func="fileClickFunc"
        :insert-target="insertTarget"
        :insert-items="insertItems"
        :modifier-key-flag="modifierKeyFlag"
        @switch-tree-data="$emit('switch-tree-data')"
      ></tree-item>
    </div>
  </details>
  
  <p v-else v-if="!model.toDelete" draggable="true"
    class="file" :class="{hide: model.props.hide, ...treeItemClass}" :style="fileStyle"
    @click.exact="fileClickFunc(model)"
    @click.ctrl.stop="toggleInsertModels"
    
    @dragstart.exact.stop="addInsertModels"
    @dragstart.ctrl.stop="recordModifierKeyFlag"
    @dragend.stop="dragEnd"
  
    @dragenter.exact.stop="dragEnterToTreeItem"
    @dragleave.exact.stop="dragLeave"
    @dragenter.ctrl.stop="addInsertModels"
  
    @dragover.prevent
    @drop.exact.stop="drop"
  >
    <span class="material-symbols-outlined hover">drag_indicator</span>{{model.name}}
  </p>
  `
}
