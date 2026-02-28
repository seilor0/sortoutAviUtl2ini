import ButtonCssIcon from './components/button-css-icon.js';
import ToggleButton from './components/toggle-button.js'
import TreeItem from './components/tree-item.js';

const {createApp, ref, computed, onMounted, toRaw} = Vue;

const rootApp = createApp({
  components: {
    ButtonCssIcon,
    ToggleButton,
    TreeItem,
  },
  
  setup () {
    let defValJson = {};
    
    const setting = ref({
      process: 'home',
      type: 'Effect',
      previewFont: {enabled:true, fontSize:1, defFontFamily:''},
      labelSort: {isAsc:true, style:'folderIsBottom'},
      delDupSort: {isAsc:true, style:'initOrder'},
    });

    /** 現在インストールされているパッケージのセット */
    const installedPackage = {
      loaded: false,
      data: new Map([
        [ 'Effect', new Set() ], // anm2, cam2, scn2, obj2, .object(alias)
        [ 'Movement', new Set() ], // tra2
        [ 'Params', new Set() ], // params
      ])
    };

    const delDupSortType = ref([
      {label:'X', value:'toDelete', isAsc:true},
      {label:'並び順', value:'order', isAsc:true},
      {label:'(読込時)', value:'initOrder', isAsc:true},
      {label:'パッケージ名', value:'name', isAsc:true},
    ]);

    const systemArr = [];
    /**
     * folder ... { name, isOpen, order, children }
     * file   ... { name, initOrder, toDelele, uninstalled, props:{ order, hide, ... } }
     */
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
    
    /** treeDataMapをflatにしたもの
     * { name, initOrder, toDelele, uninstalled, props:{ order, hide, ... } } [] */
    const packageDataMap = computed(() => {
      const resultMap = new Map();
      treeDataMap.value.forEach((treeDatas, key) => {
        orderTreeDatas(treeDatas);
        const resultArr = tree2array(treeDatas);
        resultMap.set(key, resultArr);
      });
      console.log('treeDataMap', treeDataMap.value);
      console.log('--> compute packageDataMap', resultMap);
      return resultMap;
  
      function tree2array (treeDatas, labels=[]) {
        const resultArr = [];
        treeDatas.forEach( treeData => {
          if (!treeData.children) {
            treeData.props.label = labels;
            resultArr.push(treeData);
          } else {
            let arr = tree2array(treeData.children, [...labels, treeData.name]);
            resultArr.push(...arr);
          }
        });
        return resultArr;
      }
    });

    const delDupData = computed(() => {
      const sortStyle = setting.value.delDupSort.style;
      const isAsc = setting.value.delDupSort.isAsc ? 1 : -1;
      const target = packageDataMap.value.get(setting.value.type);
      if (sortStyle==='order')
        return target.toSorted((a,b) => isAsc * (a.props.order - b.props.order));
      else 
        return target.toSorted((a,b) => isAsc * (a[sortStyle] > b[sortStyle] ? 1 : -1));
    });

    const fontFamilySet = ref(new Set());


    
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
      /** { name, initOrder, toDelele, uninstalled, props:{ order, hide, label:[] } } [] */
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
          if (/^(?:Color|Effect|Font|Movement|Params)\..+/.test(el)) {
            const splitArr = el.trim().split('\r\n');
            const {type, name} = splitArr.shift().match(/(?<type>.+?)\.(?<name>.+?)]$/).groups;

            const dic = {name:name, initOrder:null, toDelete:false, uninstalled:false, props:{}};
            
            if (
               installedPackage.loaded &&
               installedPackage.data.has(type) &&
              !installedPackage.data.get(type).has(name)
            ) {
              dic.toDelete = true;
              dic.uninstalled = true;
            }
      
            splitArr.forEach(row => {
              let {key, value} = row.match(/(?<key>.+?)=(?<value>.*)/).groups;
              if (key=='label') value=value.split('\\').filter(Boolean);
              else if (key=='hide'||key=='order') value = parseInt(value);
              dic.props[key] = value;
            });
            dic.initOrder = dic.props.order;
            initPackageData.get(type).push(dic);
          }
          else {
            systemArr.push('[' + el.trim());
          }
        });
      
      initPackageData.forEach(arr => arr.sort((a,b) => a.props.order - b.props.order));

      
      // update fontfamily set and add font style
      const fontFamilyArr = [];
      initPackageData.get('Font').forEach(dic => {
        let fontFamily = dic.name;
        const fontDic = {fontFamily: null, fontWeight: null, fontStretch: null};

        // weight
        for (const key in defValJson.fontWeightDic) {
          const regExp = new RegExp(` ${key}\\b`,'i');
          if (!regExp.test(fontFamily)) continue;
          fontDic.fontWeight = defValJson.fontWeightDic[key];
          fontFamily = fontFamily.replace(regExp,'');
          break;
        }
        // condensed
        for (const key in defValJson.fontCondDic) {
          const regExp = new RegExp(` ${key}\\b`,'i');
          if (!regExp.test(fontFamily)) continue;
          fontDic.fontStretch = defValJson.fontCondDic[key];
          fontFamily = fontFamily.replace(regExp,'');
          break;
        }
        // font-family
        fontDic.fontFamily = fontFamily;

        dic.fontStyle = fontDic;
        fontFamilyArr.push(fontFamily);
      });
      fontFamilySet.value = new Set(fontFamilyArr.sort());


      // transform to tree data
      initPackageData.forEach((packages, key) => {
        const resultArr = [];
        packages.forEach(packageDic => {
          let addTarget = resultArr;
          packageDic.props.label.forEach(label => {
            const existFolder = addTarget.find(dic=>dic.name===label);
            if (existFolder) addTarget = existFolder.children;
            else {
              const newFolder = {name:label, isOpen:true, children:[]};
              addTarget.push(newFolder);
              addTarget = newFolder.children;
            }
          });
          addTarget.push(packageDic);
        });
        orderTreeDatas(resultArr);
        initTreeDataMap.set(key, resultArr);
      });
      treeDataMap.value = structuredClone(initTreeDataMap);
      console.log('initPackageData', initPackageData);

      if (setting.value.process==='home') setting.value.process = 'labeling';
    }

    async function readInstalledPackage(e) {
      const files = e.currentTarget.files;
      if (!files) return;

      // initialize
      installedPackage.data.values().forEach(set=>set.clear());

      // add default package
      defValJson.defMovement.forEach(name => installedPackage.data.get('Movement').add(name));
      defValJson.defParams.forEach(name => installedPackage.data.get('Params').add(name));
      defValJson.defEffect.forEach(name => installedPackage.data.get('Effect').add(name));

      // add packages to installedPackage
      await Promise.all(Array.from(files, async file => {
        const {filename, extension} = file.name.match(/(?<filename>.+)\.(?<extension>.+?)$/)?.groups;

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
        const target = packageDataMap.get(key);
        target.forEach(dic => {
          if (set.has(dic.name)) return;
          dic.uninstalled = true;
          dic.toDelete = true;
        });
      });
    }

    function resetPackageData() {
      treeDataMap.value = structuredClone(initTreeDataMap);
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
          .filter(dic=>!dic.toDelete)
          .sort((a,b) => a.props.order - b.props.order)
          .forEach(packageDic=> {
            resultArr.push(`[${key}.${packageDic.name}]`);
            Object.entries(packageDic.props).forEach(([key,value]) => {
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

    function clickNextInput(e) {
      e.currentTarget.nextElementSibling?.click();
    }

    function toggleHide (model) {
      model.props.hide = Math.abs(model.props.hide - 1);
    }

    function orderTreeDatas (treeDatas, startOrder=0) {
      if (startOrder===0) console.log('order tree datas', treeDatas[0]?.name);
      let order = startOrder-1;
      treeDatas.forEach( treeData => {
        if (!treeData.children) {
          order = Math.floor(order) + 1;
          treeData.props.order = order;
          
        } else {
          order += 0.01;
          treeData.order = order;
          order = orderTreeDatas(treeData.children, order+1);
        }
      });
      return order;
    }
    


    const insertTarget = ref([]); // {parent, index}
    const insertItems = ref([]); // {model, parent, index}
    const modifierKeyFlag = ref({ctrl:null, alt:null, shift:null});

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
    
    function dragStartNewFolder () {
      insertItems.value.push({model: {name:'', isOpen:true, children:[]}, parent:null, index:null});
    }
    function dragEndNewFolder () {
      insertTarget.value.splice(0);
      insertItems.value.splice(0);
    }

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
        const target = treeDataMap.value.get(setting.value.type);
        const index = toTop ? 0 : target.length;
        target.splice(index, 0, ...insertItems.value.map(item=>item.model));

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
      orderTreeDatas(treeDataMap.value.get(setting.value.type));
    }

    const resultDivClass = computed(() => {
      const target = treeDataMap.value.get(setting.value.type);
      const targetDownFlag = 
        insertTarget.value[0]?.parent === target && 
        insertTarget.value[0]?.index === target.length;
      return {'target-down': targetDownFlag, };
    });
    function dragEnterToResultDiv (e) {
      if (e.offsetY > e.currentTarget.getBoundingClientRect().height-150) {
        const target = treeDataMap.value.get(setting.value.type);
        insertTarget.value.push({parent: target, index: target.length});
        console.log('add result div');
      }
    }
    function dragLeaveFromResultDiv () {
      const target = insertTarget.value[0];
      const modelData = treeDataMap.value.get(setting.value.type);
      if (target?.parent===modelData && target?.index===modelData.length) {
        console.log('leave result div');
        insertTarget.value.shift();
      }
    }
    function dropToResultDiv () {
      console.log('-------------');
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
      defValJson = await fetch('./defaultValue.json').then(res=>res.json());
    });



    return {
      delDupSortType,

      setting,
      treeDataMap,
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
      dragStartNewFolder,
      dragEndNewFolder,

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