import ButtonCssIcon from "./button-css-icon.js";
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

  components: {ButtonCssIcon},
  emits: ['switch-tree-data'],

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
    }

    function toggleHide (model) {model.props.hide = 1-model.props.hide;}

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
    }
    function dragEnterToEmptyFolderBody () {
      props.insertTarget.push({parent: props.model.children, index: 0});
    }
    function dragEnterToFillFolderBody (e) {
      if (e.offsetY > e.currentTarget.getBoundingClientRect().height-8)
        props.insertTarget.push({parent: props.model.children, index: props.model.children.length});
    }
    function dragEnterToFolderBody (e) {
      if (props.model.children?.length) {
        if (e.offsetY > e.currentTarget.getBoundingClientRect().height-8)
          props.insertTarget.push({parent: props.model.children, index: props.model.children.length});
      } else {
        props.insertTarget.push({parent: props.model.children, index: 0});
      }
    }
    
    function dragLeave () {
      props.insertTarget.shift();
    }
    function dragLeaveFromFillFolderBody () {
      const target = props.insertTarget[0];
      if (target?.parent===props.model.children && target?.index===props.model.children.length)
        props.insertTarget.shift();
    }
    function dragLeaveFromFolderBody () {
      if (props.model.children?.length) {
        const target = props.insertTarget[0];
        if (target?.parent===props.model.children && target?.index===props.model.children.length)
          props.insertTarget.shift();  
      } else {
        props.insertTarget.shift();
      }
    }
    
    function drop () {
      console.log('-------------');
      if (!props.insertTarget[0]) {
        console.log('drop target is NOT exist.');
        return;
      }
      console.log('drop for :', toRaw(props.insertTarget[0]));

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

    function dragEnd (e) {
      if (e.ctrlKey) return;
        props.insertTarget.splice(0);
        props.insertItems.splice(0);
      }
    // function dragEnd () {
    //   // console.log('drag end', props.modifierKeyFlag.ctrl);
    //   if (!props.modifierKeyFlag.ctrl) {
    //     props.insertTarget.splice(0);
    //     props.insertItems.splice(0);
    //   }
    //   clearModifierKeyFlag();
    // }


    // -----------------------
    //         test
    // -----------------------
    function mouseEnterToTreeItem (e) {
      props.insertTarget.push({parent: props.parentArray, index: props.index});
    }
    function mouseEnterToFolderBody (e) {
      const bodyHeight = e.currentTarget.getBoundingClientRect().height;
      const index = e.offsetY > bodyHeight/2 ? props.model.children.length : 0;
      props.insertTarget.push({parent: props.model.children, index: index});
    }
    function mouseLeaveFromTreeItem (e) {
      props.insertTarget.pop();
      // folder-body or result-divがドロップ対象になるので、
      // indexをマウス位置に応じて修正
      const bodyRect = e.currentTarget.parentElement.getBoundingClientRect();
      const bodyCenter = (bodyRect.top + bodyRect.bottom) / 2;
      const index = e.pageY > bodyCenter ? props.parentArray.length : 0;
      props.insertTarget.at(-1).index = index;
    }
    function mouseLeaveFromFolderBody (e) {
      props.insertTarget.pop();
    }

    // drag-start相当
    function mousedown (e) {
      console.log('mouse-down : ', e.currentTarget);
      console.log(e);
    }
    // drop, drag-end相当
    function mouseup (e) {
      console.log('mouse-up : ', e.currentTarget);
      console.log(e);
    }


    return {
      packageStyle,
      treeItemClass,
      folderBodyClass,
      
      ungroupFolder,
      sortTreeData,
      toggleDetails,
      toggleHide,

      addInsertModels,
      toggleInsertModels,

      dragEnterToTreeItem,
      dragEnterToEmptyFolderBody,
      dragEnterToFillFolderBody,
      dragEnterToFolderBody,
      
      dragLeave,
      dragLeaveFromFillFolderBody,
      dragLeaveFromFolderBody,

      dragEnd,
      drop,

      mouseEnterToTreeItem,
      mouseEnterToFolderBody,
      mouseLeaveFromTreeItem,
      mouseLeaveFromFolderBody,

      mousedown,
      mouseup,
    }
  },

  template: `
  <details v-if="Boolean(model.children)" :open="model.isOpen"
    class="folder" :class="treeItemClass"
    @click.ctrl.stop.prevent="toggleInsertModels"
  
    @dragstart.exact.stop="addInsertModels"
    @dragstart.ctrl.stop
    @dragend.stop="dragEnd"
    
    @dragenter.exact.stop="dragEnterToTreeItem"
    @dragleave.exact.stop="dragLeave"
    @dragenter.ctrl.stop="addInsertModels"
  
    @dragover.prevent
    @drop.exact.stop="drop"
  >
    
    <summary @click.stop.prevent="toggleDetails(!model.isOpen, model, parentArray, $event.shiftKey, $event.altKey)">
      <span class="material-symbols-outlined hover">drag_indicator</span>
      <div>
        <span class="folder-name-wrap">
          <input type="text" v-model="model.name" class="folder-name" placeholder="グループ名を入力" @click.exact.stop />
        </span>
        <span class="material-symbols-outlined" @click.stop.prevent="sortTreeData(model.children, $event.altKey)">sort</span>
        <button-css-icon icon-name="icon-close" @click.stop.prevent="ungroupFolder(model, parentArray, index)"></button-css-icon>
      </div>
    </summary>
  
    <div class="folder-body" :class="folderBodyClass"
      @dragenter.exact.stop="dragEnterToFolderBody"
      @dragleave.exact.stop="dragLeaveFromFolderBody"
      @dragenter.ctrl.stop
      @dragover.prevent
      @drop.exact.stop="drop"
    >
      <tree-item v-for="(childModel, index) in model.children"
        :model="childModel"
        :parent-array="model.children"
        :index="index"
        :insert-target="insertTarget"
        :insert-items="insertItems"
        :setting="setting"
        :drag-data="dragData"
        @switch-tree-data="$emit('switch-tree-data')"
      ></tree-item>
    </div>
  </details>
  
  <p v-else v-if="!model.toDelete"
    class="package" :class="{hide: model.props.hide, ...treeItemClass}" :style="packageStyle"
    @click.exact="toggleHide(model)"
    @click.ctrl.stop="toggleInsertModels"
    
    @dragstart.exact.stop="addInsertModels"
    @dragstart.ctrl.stop
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
