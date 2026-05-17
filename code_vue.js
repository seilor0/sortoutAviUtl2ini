import ButtonCssIcon from './components/button-css-icon.js';
import ToggleButton from './components/toggle-button.js'
import TreeItem from './components/tree-item.js';

import {PackageModel, FolderModel} from './components/class.js'

const {createApp, ref, computed, watch, onMounted, toRaw} = Vue;

const rootApp = createApp({
  components: {
    ButtonCssIcon,
    ToggleButton,
    TreeItem,
  },
  
  setup () {
    let defPackageDic = {};
    let fontEquivDic = {};

    const setting = ref({
      process: "home",
      type: "Effect",
      previewFont: {
        enabled: true,
        fontSize: 1,
        defFontFamily: ""
      },
      labelSort: {
        isAsc: true,
        style: "folderIsBottom"
      },
      delDupSort: {
        isAsc: true,
        style: "initOrder"
      },
      setToHide: true
    });

    const delDupSortType = ref([
      {label:'X', value:'toDelete', isAsc:true},
      {label:'並び順', value:'order', isAsc:true},
      {label:'(読込時)', value:'initOrder', isAsc:true},
      {label:'パッケージ名', value:'name', isAsc:true},
    ]);

    /** 現在インストールされているパッケージのセット */
    const installedPackage = {
      loaded: false,
      data: new Map([
        [ 'Effect', new Set() ], // anm2, cam2, scn2, obj2, .object(alias)
        [ 'Movement', new Set() ], // tra2
        [ 'Params', new Set() ], // params
      ])
    };

    const systemArr = [];
    const fontFamilySet = ref(new Set());

    /** FolderModel or PackageModel */
    const treeDataMap = ref(new Map([
      [ 'Color',    [] ],
      [ 'Effect',   [] ],
      [ 'Font',     [] ],
      [ 'Movement', [] ],
      [ 'Params',   [] ],
    ]));

    /** 読み込み時のtreeDataMap */
    const initTreeDataMap = new Map([
      [ 'Color',    [] ],
      [ 'Effect',   [] ],
      [ 'Font',     [] ],
      [ 'Movement', [] ],
      [ 'Params',   [] ],
    ]);

    const shownTreeData = computed(()=>treeDataMap.value.get(setting.value.type));
    
    /** treeDataMapをflatにしたもの
     * PackageModel [] */
    const packageDataMap = computed(() => {
      const resultMap = new Map();
      treeDataMap.value.forEach((modelDatas, key) => {
        orderTreeDatas(modelDatas);
        const resultArr = tree2array(modelDatas);
        resultMap.set(key, resultArr);
      });
      console.log('compute package-data-map.');
      console.log('treeDataMap : ', treeDataMap.value);
      console.log('--> packageDataMap : ', resultMap);
      return resultMap;
  
      function tree2array (modelDatas, labels=[]) {
        const resultArr = [];
        modelDatas.forEach(modelData => {
          // package model
          if (!modelData.children) {
            modelData.props.label = [...labels];
            resultArr.push(modelData);
          // folder model
          } else {
            const arr = tree2array(modelData.children, [...labels, modelData.name]);
            resultArr.push(...arr);
          }
        });
        return resultArr;
      }
    });

    /** PackageModel [] */
    const delDupData = computed(() => {
      const sortStyle = setting.value.delDupSort.style;
      const isAsc = setting.value.delDupSort.isAsc ? 1 : -1;
      const target = packageDataMap.value.get(setting.value.type);
      if (sortStyle==='order')
        return target.toSorted((a,b) => isAsc * (a.props.order - b.props.order));
      else 
        return target.toSorted((a,b) => isAsc * (a[sortStyle] > b[sortStyle] ? 1 : -1));
    });


    
    async function readIniFile(e) {
      const file = e.currentTarget.files[0];
      if (!file) return;
      e.currentTarget.value = null;

      // initialize
      initTreeDataMap.forEach(arr=>arr.splice(0));
      treeDataMap.value.forEach(arr=>arr.splice(0));
      systemArr.splice(0);
      fontFamilySet.value.clear();

      // read file
      /** PackageModel [] */
      const initPackageData = new Map([
        [ 'Color',    [] ],
        [ 'Effect',   [] ],
        [ 'Font',     [] ],
        [ 'Movement', [] ],
        [ 'Params',   [] ],
      ]);

      (await file.text())
        .split(/^\[/mg)
        .filter(Boolean)
        .forEach(el => {
          if (/^(?:Color|Effect|Font|Movement|Params)\..+\](?:\r\n|\n|$)/.test(el)) {
            const splitArr = el.trim().split('\r\n');
            const {type, name} = splitArr.shift().match(/(?<type>.+?)\.(?<name>.+?)]$/)?.groups ?? {};
            if (!type) return;

            const model = new PackageModel({name:name});
            // const model = {name:name, initOrder:null, toDelete:false, uninstalled:false, props:{}};
            
            if (
               installedPackage.loaded &&
               installedPackage.data.has(type) &&
              !installedPackage.data.get(type).has(name)
            ) {
              model.toDelete = true;
              model.uninstalled = true;
            }
      
            splitArr.forEach(row => {
              let {key, value} = row.match(/(?<key>.+?)=(?<value>.*)/)?.groups ?? {};
              if (!key) return;
              if (key=='label') value=value.split('\\').filter(Boolean);
              else if (key=='hide'||key=='order') value = parseInt(value);
              model.props[key] = value;
            });
            model.initOrder = model.props.order;
            initPackageData.get(type).push(model);
          }
          else {
            systemArr.push('[' + el.trim());
          }
        });
      
      initPackageData.forEach(arr => arr.sort((a,b) => a.props.order - b.props.order));

      
      // update fontfamily set and add font style
      const fontFamilyArr = [];
      initPackageData.get('Font').forEach(model => {
        let fontFamily = model.name;
        const fontDic = {fontFamily: null, fontWeight: null, fontStretch: null};

        // weight
        const weightKey = [...Object.keys(fontEquivDic.fontWeight)].find(key => new RegExp(` ${key}\\b`,'i').test(fontFamily));
        if (weightKey) {
          fontDic.fontWeight = fontEquivDic.fontWeight[weightKey];
          fontFamily = fontFamily.replace(new RegExp(` ${weightKey}\\b`,'i'),'');
        }
        // condensed
        const stretchKey = [...Object.keys(fontEquivDic.fontStretch)].find(key => new RegExp(` ${key}\\b`,'i').test(fontFamily));
        if (stretchKey) {
          fontDic.fontStretch = fontEquivDic.fontStretch[stretchKey];
          fontFamily = fontFamily.replace(new RegExp(` ${stretchKey}\\b`,'i'),'');
        }
        // font-family
        fontDic.fontFamily = fontFamily;
        fontFamilyArr.push(fontFamily);
        model.fontStyle = fontDic;
      });
      fontFamilySet.value = new Set(fontFamilyArr.sort());


      // transform to tree data
      initPackageData.forEach((modelArr, key) => {
        const resultArr = [];
        modelArr.forEach(packageModel => {
          let addTarget = resultArr;
          packageModel.props.label.forEach(label => {
            const existFolder = addTarget.find(model=>model.name===label);
            if (existFolder) addTarget = existFolder.children;
            else {
              const newFolder = new FolderModel({name:label});
              addTarget.push(newFolder);
              addTarget = newFolder.children;
            }
          });
          addTarget.push(packageModel);
        });
        orderTreeDatas(resultArr);
        treeDataMap.value.set(key, resultArr);
        initTreeDataMap.set(key, resultArr.map(model=>model.clone()));
      });
      console.log('read aviutl2.ini.');
      console.log('init-tree-data-map : ', initTreeDataMap);

      if (setting.value.process==='home') setting.value.process = 'labeling';
    }

    async function readInstalledPackage(e) {
      const files = e.currentTarget.files;
      if (!files) return;

      // initialize
      installedPackage.loaded = true;
      installedPackage.data.values().forEach(set=>set.clear());

      // add default package
      Object.keys(defPackageDic).forEach(key=>
        installedPackage.data.set(key, new Set(defPackageDic[key]))
      );

      // add packages to installedPackage
      await Promise.all(Array.from(files, async file => {
        const {filename, extension} = file.name.match(/(?<filename>.+)\.(?<extension>.+?)$/)?.groups ?? {};

        if (!/^(?:anm2?|cam2?|scn2?|obj2?|tra2?|object|effect|params)$/.test(extension)) return;

        // param
        if (extension==='params') {
          const text = await file.text();
          text.split('\r\n').filter(Boolean).forEach(row => {
            if (row.charAt(0)===';') return;
            const paramname = row.match(/^(.+)=[\d\-., ]*$/)?.[1];
            installedPackage.data.get('Params').add(`${paramname}@${filename}`);
          });
        }
        // alias
        else if (extension==='object' || extension==='effect') {
          installedPackage.data.get('Effect').add(`${extension}.${filename}`);
        }
        // anm2?|cam2?|scn2?|obj2?|tra2?
        else {
          const addTargetSet = installedPackage.data.get(extension.startsWith('tra') ? 'Movement' : 'Effect');
          // デフォルトのスクリプトファイル
          if (filename==='script') {
            let text;
            if (extension.endsWith('2')) text = await file.text();
            else text = new TextDecoder('shift_jis').decode(await file.arrayBuffer());
            text.match(/(?<=^@).+$/mg).forEach(packagename => addTargetSet.add(packagename));
          } 
          // 複数スクリプトファイル
          else if (filename.charAt(0)==='@') {
            let text;
            if (extension.endsWith('2')) text = await file.text();
            else text = new TextDecoder('shift_jis').decode(await file.arrayBuffer());
            text.match(/(?<=^@).+$/mg).forEach(packagename => addTargetSet.add(packagename+filename));
          } 
          // 単一スクリプトファイル
          else {
            addTargetSet.add(filename);
          }
        }
      }));

      // reflect to packageData
      installedPackage.data.forEach((set, key) => {
        packageDataMap.value.get(key).forEach(pacakgeModel => {
          if (set.has(pacakgeModel.name)) return;
          pacakgeModel.uninstalled = true;
          pacakgeModel.toDelete = true;
        });
      });
    }

    function resetPackageData() {
      treeDataMap.value.keys().forEach(key => 
        treeDataMap.value.set(key, initTreeDataMap.get(key).map(model=>model.clone()))
      );
    }

    function clear() {
      initTreeDataMap.forEach(arr => arr.splice(0));
      treeDataMap.value.forEach(arr=>arr.splice(0));
      systemArr.splice(0);
      fontFamilySet.value.clear();
      setting.value.previewFont.defFontFamily = '';
    }

    function saveIniFile() {
      const resultArr = [...systemArr];
      packageDataMap.value.forEach((packageArr,key) => {
        packageArr
          .filter(pacakgeModel=>!pacakgeModel.toDelete)
          .sort((a,b) => a.props.order - b.props.order)
          .forEach(packageModel=> {
            resultArr.push(`[${key}.${packageModel.name}]`);
            Object.entries(packageModel.props).forEach(([key,value]) => {
              if (key==='label') value = value.filter(Boolean).join('\\');
              resultArr.push(`${key}=${value}`);
            });
          });
      });

      // save
      const blob = new Blob([resultArr.join('\r\n')], {type:'text/plain'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'aviutl2.ini';
      link.click();
    }

    function dropInifile (e) {
      if (!e.dataTransfer.files[0].name.endsWith('.ini')) return;
      document.getElementById('iniInput').files = e.dataTransfer.files;
      document.getElementById('iniInput').dispatchEvent(new Event('change'));
    }

    function clickNextInput(e) {e.currentTarget.nextElementSibling?.click();}

    function toggleHide (model) {model.props.hide = 1 - model.props.hide;}

    function orderTreeDatas (modelDatas, startOrder=0) {
      if (startOrder===0) console.log('order tree datas', modelDatas[0]?.name);
      let order = startOrder-1;
      modelDatas.forEach(modelData => {
        // package model
        if (!modelData.children) {
          order = Math.floor(order) + 1;
          modelData.props.order = order;
        // folder model
        } else {
          order += 0.01;
          modelData.order = order;
          order = orderTreeDatas(modelData.children, order+1);
        }
      });
      return order;
    }
    


    /** { parent, index } */
    const insertTarget = ref([]);
    /** { model, parent, index } */
    const insertItems = ref([]);
    const modifierKeyFlag = ref({ctrl:null, alt:null, shift:null});

    /** 選択フォルダ内の要素をInsertItemsから除く
     * これをしないと要素がフォルダ外に出てしまう
     */
    function deleteChildTreeItem (modelArr) {
      modelArr
        .filter(model => model.children)
        .forEach(model => {
          // modelの子modelがinsertModelsにあったら削除
          model.children.forEach(child => {
            const i = insertItems.value.findIndex(item=>item.model===child);
            if (i>-1) insertItems.value.splice(i,1);
            if (child.children) deleteChildTreeItem(child.children);
          });
        });
    }

    function bulkSetHide (model, newState, includeDecendant=false) {
      // パッケージの場合
      if (!model.children) model.props.hide = newState ? 1 : 0;
      // フォルダの場合
      else if (includeDecendant) model.children.forEach(child=>bulkSetHide(child, newState));
    }
    
    function dragStartNewFolder () {
      insertItems.value.push({model: new FolderModel(), parent:null, index:null});
    }
    function clearInsertChoice () {
      insertTarget.value.splice(0);
      insertItems.value.splice(0);
    }
    watch(()=>[setting.value.process, setting.value.type], clearInsertChoice);

    function dragLeaveFromDropArea (e) {
      console.log(e.target, e.currentTarget);
      if (e.target.classList.contains('material-symbols-outlined')) return;
      e.currentTarget.classList.remove('target');
    }
    function dropToDropArea (e, toAll, toTop) {
      e.currentTarget.classList.remove('target');
      // 前準備
      // フォルダに含まれている子要素をinsertItemsから削除
      deleteChildTreeItem(insertItems.value.map(item=>item.model));

      // 挿入アイテムのソート ... 選択順で追加されてしまうため
      insertItems.value
        .sort((a, b)=>{
          const aOrder = a.model.children ? a.model.order : a.model.props.order;
          const bOrder = b.model.children ? b.model.order : b.model.props.order;
          return aOrder - bOrder;
        });

      if (toAll) { // 全体の先頭/末尾へ
        // 大元アイテムの削除
        insertItems.value.forEach(item=>{
          if (!item.parent) return;
          const i = item.parent.findIndex(model=>model===item.model);
          item.parent.splice(i, 1);
        });
        // 挿入
        const index = toTop ? 0 : shownTreeData.value.length;
        shownTreeData.value.splice(index, 0, ...insertItems.value.map(item=>item.model));

      } else { // グループの先頭/末尾へ
        insertItems.value
          .forEach(item => {
            // 大元アイテムの削除
            if (item.parent) {
              const i = item.parent.findIndex(model=>model===item.model);
              item.parent.splice(i, 1);
            }
            // 挿入
            const index = toTop ? 0 : item.parent.length;
            item.parent.splice(index, 0, item.model);
          });
      }
      orderTreeDatas(shownTreeData.value);
    }

    const resultDivClass = computed(() => {
      const targetDownFlag = 
        insertTarget.value[0]?.parent === shownTreeData.value && 
        insertTarget.value[0]?.index === shownTreeData.value.length;
      return {'target-down': targetDownFlag, };
    });
    function dragEnterToResultDiv (e) {
      if (e.offsetY > e.currentTarget.getBoundingClientRect().height-150) {
        insertTarget.value.push({parent: shownTreeData.value, index: shownTreeData.value.length});
        console.log('add result div');
      }
    }
    function dragLeaveFromResultDiv () {
      const target = insertTarget.value[0];
      if (target?.parent===shownTreeData.value && target?.index===shownTreeData.value.length) {
        console.log('leave result div');
        insertTarget.value.shift();
      }
    }
    function dropToResultDiv () {
      console.log('-------------');
      if (!insertTarget.value[0]) {
        console.log('drop target is NOT exist.');
        return;
      }
      console.log('drop for :', toRaw(insertTarget.value[0]));

      // フォルダに含まれている子要素をinsertItemsから削除
      deleteChildTreeItem(insertItems.value.map(item=>item.model));
      
      // 挿入アイテムのソート ... 選択順で追加されてしまうため
      insertItems.value
        .sort((a, b)=>{
          const aOrder = a.model.children ? a.model.order : a.model.props.order;
          const bOrder = b.model.children ? b.model.order : b.model.props.order;
          return aOrder - bOrder;
        });

      // 大元アイテムの削除
      insertItems.value.forEach(item=>{
        if (!item.parent) return;
        const i = item.parent.findIndex(model=>model===item.model);
        item.parent.splice(i, 1);
      });
      
      // 挿入
      const target = insertTarget.value[0];
      target.parent.splice(target.index, 0, ...insertItems.value.map(item=>item.model));
    }



    onMounted(async () => {
      setting.value = await fetch('./data/setting.json').then(res=>res.json());
      defPackageDic = await fetch('./data/default-packages.json').then(res=>res.json());
      fontEquivDic  = await fetch('./data/font-style.json').then(res=>res.json());
    });



    return {
      delDupSortType,

      setting,
      treeDataMap,
      shownTreeData,
      packageDataMap,

      fontFamilySet,

      delDupData,

      readIniFile,
      readInstalledPackage,
      resetPackageData,
      clear,
      saveIniFile,
      dropInifile,
      
      clickNextInput,
      toggleHide,
      orderTreeDatas,

      insertTarget,
      insertItems,
      modifierKeyFlag,
      bulkSetHide,
      dragStartNewFolder,
      clearInsertChoice,

      dragLeaveFromDropArea,
      dropToDropArea,

      resultDivClass,
      dragEnterToResultDiv,
      dragLeaveFromResultDiv,
      dropToResultDiv,
    }
  }
});
rootApp.mount('#root');