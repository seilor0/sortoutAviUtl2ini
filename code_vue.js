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
      labelSort: {isAsc:true, folderIsBottom:true},
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
      file ... { name, initOrder, toDelele, uninstalled, props:{ order, hide, label:[] } }
      folder ... { name, children }
    ]
    */
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
    const systemArr = [];

    // const packageData = ref(new Map([
    //   [ 'Color',    [] ],
    //   [ 'Effect',   [] ],
    //   [ 'Font',     [] ],
    //   [ 'Movement', [] ],
    //   [ 'Params',   [] ],
    // ]));
    const packageData = computed(() => {
      const resultMap = new Map();
      treeDataMap.value.forEach((treeDatas, key) => {
        const [count, resultArr] = tree2array(treeDatas, 0, []);
        resultMap.set(key, resultArr);
      });
      return resultMap;
  
      function tree2array (treeDatas, startOrder, labels) {
      let order = startOrder;
      const resultArr = [];
        treeDatas.forEach( treeData => {
        if (!treeData.children) {
            treeData.props.label = labels;
            treeData.props.order = order++;
            resultArr.push(treeData);

        } else {
            let [order2, arr] = tree2array(treeData.children, order, [...labels, treeData.name]);
          order = order2;
          resultArr.push(...arr);
        }
      });
      return [order, resultArr];
    }

    const delDupData = computed(() => {
      const sortStyle = setting.value.delDupSort.style;
      const isAsc = setting.value.delDupSort.isAsc ? 1 : -1;
      const target = packageDataMap.value.get(setting.value.type);
      if (sortStyle==='order')
        return target.toSorted((a,b) => isAsc * (a.props.order - b.props.order));
      else 
        return target.toSorted((a,b) => isAsc * (a[sortStyle] > b[sortStyle] ? 1 : -1));
    });


    // fontname: {fontFamily, fontWeight, fontStretch}
    const fontMap = ref(new Map());
    const fontStyleMap = computed(() => {
      const map = new Map([]);
      fontMap.value.forEach((value,key) => {
        const dic = {...value};
        dic.fontFamily = `"${value.fontFamily}", "${setting.value.previewFont.defFontFamily}"`
        map.set(key, dic);
      });
      return map;
    });
    const fontFamilySet = computed(() => {
      const arr = Array.from(fontMap.value.values(), dic=>dic.fontFamily).sort();
      return new Set(arr);
    });

    
    async function readIniFile(e) {
      const file = e.currentTarget.files[0];
      if (!file) return;

      // initialize
      initTreeDataMap.forEach(arr=>arr.splice(0));
      treeDataMap.value.forEach(arr=>arr.splice(0));
      systemArr.splice(0);
      fontMap.value.clear();

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

      // transform to tree data
      initPackageData.forEach((value, key) => {
        const resultArr = [];
        value.forEach(packageDic => {
          let addTarget = resultArr;
          packageDic.props.label.forEach(label => {
            const existFolder = addTarget.find(dic=>dic.name===label);
            if (existFolder) addTarget = existFolder.children;
            else {
              const newFolder = {name:label, children:[]};
              addTarget.push(newFolder);
              addTarget = newFolder.children;
            }
          });
          const addDic = structuredClone(packageDic);
          delete addDic.label;
          addTarget.push(addDic);
        });
        initTreeDataMap.set(key, resultArr);
      });
      treeDataMap.value = structuredClone(initTreeDataMap);
      console.log(structuredClone(initTreeDataMap));
      
      // update font map
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

        fontMap.value.set(dic.name, fontDic);
      });

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
        const target = packageData.value.get(key);
        target.forEach(dic => {
          if (set.has(dic.name)) return;
          dic.uninstalled = true;
          dic.toDelete = true;
        });
      });
    }

    function resetPackageData() {
      packageData.value = structuredClone(initTreeDataMap);
    }

    function saveIniFile() {
      console.log(packageData.value);
    }

    function clickNextInput(e) {
      e.currentTarget.nextElementSibling?.click();
    }

    function toggleToDelete (dic) {
      dic.toDelete = !dic.toDelete;
    }

    function toggleHide (model) {
      model.props.hide = Math.abs(model.props.hide - 1);
    }


    onMounted(async () => {
      defValJson = await fetch('./defaultValue.json').then(res=>res.json());
    });


    return {
      delDupSortType,

      setting,
      packageData,
      treeDataMap,

      fontStyleMap,
      fontFamilySet,

      delDupData,

      readIniFile,
      readInstalledPackage,
      resetPackageData,
      saveIniFile,
      clickNextInput,
      toggleToDelete,
      toggleHide,
    }
  }
});
rootApp.mount('#root');