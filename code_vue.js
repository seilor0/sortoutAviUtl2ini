import toggleButton from './components/toggle-button.js'

const {createApp, ref, computed, onMounted} = Vue;

const rootApp = createApp({

  components: {
    toggleButton,
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
      delDupSortStyle: 'initOrder'
    });

    /**
     * { name, initOrder, toDelele, uninstalled, props:{ order:Number, hide:Boolean, label:[] } } []
     */
    const packageData = ref(new Map([
      [ 'Color',    [] ],
      [ 'Effect',   [] ],
      [ 'Font',     [] ],
      [ 'Movement', [] ],
      [ 'Params',   [] ],
    ]));
    const packageInitData = new Map([
      [ 'Color',    [] ],
      [ 'Effect',   [] ],
      [ 'Font',     [] ],
      [ 'Movement', [] ],
      [ 'Params',   [] ],
    ]); // 読み込み時のpackageData
    const systemArr = [];


    // fontname: {fontFamily, fontWeight, fontStretch}
    const fontMap = ref(new Map());
    const fontFamilySet = computed(() => {
      const arr = Array.from(fontMap.value.values(), dic=>dic.fontFamily).sort();
      return new Set(arr);
    });

    const delDupData = computed(() => {
      const sortStyle = setting.value.delDupSortStyle;
      const target = packageData.value.get(setting.value.type);
      if (sortStyle==='order')
        return target.toSorted((a,b) => a.props.order - b.props.order);
      else 
        return target.toSorted((a,b) => a[sortStyle] > b[sortStyle] ? 1 : -1);
    });

    
    async function readIniFile(e) {
      const file = e.currentTarget.files[0];
      if (!file) return;

      // initialize
      packageData.value.values().forEach(arr=>arr.splice(0));
      packageInitData.values().forEach(arr=>arr.splice(0));
      systemArr.splice(0);
      fontMap.value.clear();

      // read file
      const text = await file.text();
      text
        .replaceAll('\r\n','\n')
        .split(/^\[/mg)
        .filter(Boolean)
        .forEach(el => {
          if (/^(?:Color|Effect|Font|Movement|Params)\..+/.test(el)) {
            const splitArr = el.trim().split('\n');
            const {type, name} = splitArr.shift().match(/(?<type>.+?)\.(?<name>.+?)]$/).groups;

            const dic = {name:name, initOrder:null, toDelete:false, uninstalled:false, props:{}};
            
            if (
               installedPackage.loaded &&
               installedPackage.data.get(type) &&
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
            packageInitData.get(type).push(dic);
          }
          else {
            systemArr.push('[' + el.trim());
          }
        });
      
        packageData.value = structuredClone(packageInitData);
      
      // update font map
      packageData.value.get('Font').forEach(dic => {
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

    async function readPackage(e) {
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
      installedPackage.data.forEach((key, set) => {
        const target = packageData.value.get(key);
        target.forEach(dic => {
          if (set.has(dic.name)) return;
          dic.uninstalled = true;
          dic.toDelete = true;
        });
      });
    }

    function resetPackageData() {
      packageData.value = structuredClone(packageInitData);
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


    onMounted(async () => {
      defValJson = await fetch('./defaultValue.json').then(res=>res.json());
    });


    return {
      setting,
      packageData,
      fontMap,
      fontFamilySet,
      delDupData,

      readIniFile,
      readPackage,
      resetPackageData,
      saveIniFile,
      clickNextInput,
      toggleToDelete,
    }
  }
});
rootApp.mount('#root');