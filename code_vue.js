import ButtonCssIcon from './components/button-css-icon.js';
import ToggleButton from './components/toggle-button.js'
import TreeItem from './components/tree-item.js';

const {createApp, ref, computed, onMounted} = Vue;

const rootApp = createApp({
  components: {
    ButtonCssIcon,
    ToggleButton,
    TreeItem,
  },
  
  setup () {
    let defValJson = {};
    /**
     * 現在インストールされているパッケージのセット
     */
    const installedPackage = {
      loaded: false,
      data: new Map([
        [ 'Effect', new Set() ], // anm2, cam2, scn2, obj2, .object(alias)
        [ 'Movement', new Set() ], // tra2
        [ 'Params', new Set() ], // params
      ])
    };

    const setting = ref({
      process: 'home',
      type: 'Effect',
      previewFont: {enabled:true, fontSize:1, defFontFamily:''},
      labelSort: {isAsc:true, style:'folderIsBottom'},
      delDupSort: {isAsc:true, style:'initOrder'},
    });

    const delDupSortType = ref([
      {label:'X', value:'toDelete', isAsc:true},
      {label:'並び順', value:'order', isAsc:true},
      {label:'(読込時)', value:'initOrder', isAsc:true},
      {label:'パッケージ名', value:'name', isAsc:true},
    ]);

    /*
    treeDataMap: [
      file   ... { name, initOrder, toDelele, uninstalled, props:{ order, hide, ... } }
      folder ... { name, isOpen, order, children }
    ]
    */
    const systemArr = [];
    const treeDataMap = ref(new Map([
      [ 'Color',    [] ],
      [ 'Effect',   [] ],
      [ 'Font',     [] ],
      [ 'Movement', [] ],
      [ 'Params',   [] ],
    ]));
    // 読み込み時のpackageData
    const initTreeDataMap = new Map([
      [ 'Color',    [] ],
      [ 'Effect',   [] ],
      [ 'Font',     [] ],
      [ 'Movement', [] ],
      [ 'Params',   [] ],
    ]);
    
    // { name, initOrder, toDelele, uninstalled, props:{ order, hide, ... } } []
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
      /**
       * { name, initOrder, toDelele, uninstalled, props:{ order, hide, label:[] } } []
       */
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

    function toggleToDelete (dic) {
      dic.toDelete = !dic.toDelete;
    }

    function orderTreeDatas (treeDatas, startOrder=0) {
      if (startOrder===0) console.log('order tree datas', treeDatas[0].name);
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
    
    function dragStartNewFolder () {
      insertItems.value.push({model: {name:'', isOpen:true, children:[]}, parent:null, index:null});
    }
    function dragEnd () {
      insertTarget.value.splice(0);
      insertItems.value.splice(0);
    }



    onMounted(async () => {
      defValJson = await fetch('./defaultValue.json').then(res=>res.json());
    });

    

    async function toTest() {
      const iniFile = await fetch('./aviutl2.ini').then(res=>res.text());
      
      // initialize
      initTreeDataMap.forEach(arr=>arr.splice(0));
      treeDataMap.value.forEach(arr=>arr.splice(0));
      systemArr.splice(0);
      fontFamilySet.value.clear();

      // read file
      const initPackageData = new Map([
        [ 'Color',    [] ],
        [ 'Effect',   [] ],
        [ 'Font',     [] ],
        [ 'Movement', [] ],
        [ 'Params',   [] ],
      ]);

      iniFile
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
      toggleToDelete,
      orderTreeDatas,

      insertTarget,
      insertItems,
      modifierKeyFlag,
      dragStartNewFolder,
      dragEnd,

      toTest,
    }
  }
});
rootApp.mount('#root');