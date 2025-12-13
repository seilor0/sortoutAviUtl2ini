/**
 * スクリプト設定（この中のdicに書きこむ）
 * [{checked, type, name, defOrder, props:{}}]
 */
let rawDataArr = [];
let backupArr = [];
let systemArr = [];

const packageDic = {
  Effect: new Set(), // anm2, cam2, scn2, obj2, .object(alias)
  Movement: new Set(), // tra2
  Params: new Set(), // params
};

let defValJson = {};
fetch('./defaultValue.json').then(res=>res.json()).then(json=>defValJson=json);

const deleteDupDiv = document.querySelector('[data-process=deleteDup]');
const labelingDiv  = document.querySelector('[data-process=labeling]');

const prevFontCheckbox_labeling = document.getElementById('previewFont-labeling');
const prevFontCheckbox_deldup   = document.getElementById('previewFont-delDup');
const typeRadio_font_labeling = labelingDiv.querySelector('[name=type-labeling][value=Font]');
const typeRadio_font_deldup   = deleteDupDiv.querySelector('[name=type-delDup][value=Font]');


document.querySelectorAll('.clickNextInput').forEach(el =>
  el.addEventListener('click', (e) => e.currentTarget.nextElementSibling?.click())
);

// iniファイル選択時
document.getElementById('iniInput').addEventListener('change', async () => {
  await readIniFile();
  const process = document.querySelector('input[name=process]:checked').value;
  if      (process=='home')      document.querySelector('input[name=process][value=labeling]').click();
  else if (process=='labeling')  showResult_labeling();
  else if (process=='deleteDup') showResult_delDup();
});
// 「読み込み時の設定に戻す」ボタン
document.getElementById('back2readPt').addEventListener('click', () => {
  rawDataArr = structuredClone(backupArr);
  const process = document.querySelector('input[name=process]:checked').value;
  if      (process=='labeling')  showResult_labeling();
  else if (process=='deleteDup') showResult_delDup();
});
// 「クリア」ボタン
document.getElementById('clear').addEventListener('click', () => {
  rawDataArr.splice(0);
  backupArr.splice(0);
  systemArr.splice(0);
  deleteDupDiv.querySelector('table tbody').innerHTML = '';
  labelingDiv.querySelector('.result').innerHTML = '';
  document.getElementById('sortStyle').value = 'order';
  document.getElementById('toggleDetails').dataset.toggle = 'close';
  document.getElementById('iniInput').value = null;
  document.getElementById('defFont-labeling').innerHTML = '';
  document.getElementById('defFont-delDup').innerHTML = '';
});
//   結果保存
document.getElementById('copy').addEventListener('click', updateOrder);
document.getElementById('copy').addEventListener('click', saveFile);


// ---------------------
//   ページ切り替え
// ---------------------

// order, labelの更新
document.querySelectorAll('input[name=process]').forEach      (input=>input.addEventListener('change', updateOrder));
document.querySelectorAll('input[name=type-labeling]').forEach(input=>input.addEventListener('change', updateOrder));

// ページの表示切替
document.querySelectorAll('input[name=process]').forEach(input=>
  input.addEventListener('click', (e) => {
    document.querySelector('div[data-process].active')?.classList.remove('active');
    document.querySelector(`div[data-process=${e.currentTarget.value}]`).classList.add('active');
  })
);

// タブ名部分
document.querySelector('input[name=process][value=deleteDup]').addEventListener('click',showResult_delDup);
document.querySelector('input[name=process][value=labeling]').addEventListener('click', showResult_labeling);

// 対象選択
deleteDupDiv.querySelectorAll('input[name=type-delDup]').forEach(el=>el.addEventListener('change', showResult_delDup));
labelingDiv.querySelectorAll('input[name=type-labeling]').forEach(el=>el.addEventListener('change', showResult_labeling));


// ---------------------
//   重複を削除　ページ
// ---------------------
document.getElementById('sortStyle').addEventListener('change', showResult_delDup);

document.getElementById('scriptsInput').addEventListener('change', async(e) => {
  await readPackage(e);
  showResult_delDup();
});

// フォントプレビュー
prevFontCheckbox_deldup.addEventListener('change', (e) => {
  if (!typeRadio_font_deldup.checked) return;
  const defFont = document.getElementById('defFont-delDup').value;
  const target = deleteDupDiv.querySelectorAll('table tbody tr > :nth-child(3)');
  target.forEach(cell => previewFont(cell, e.currentTarget.checked ? cell.innerText : null, defFont));
});
// default font
document.getElementById('defFont-delDup').addEventListener('change', (e) => {
  if (!typeRadio_font_deldup.checked) return;
  if (!prevFontCheckbox_deldup.checked) return;
  const target = deleteDupDiv.querySelectorAll('table tbody tr > :nth-child(3)');
  target.forEach(cell => previewFont(cell, cell.innerText, e.currentTarget.value));
});


// ---------------------
//   ラベリング　ページ
// ---------------------
// フォントプレビュー
prevFontCheckbox_labeling.addEventListener('change', (e) => {
  if (!typeRadio_font_labeling.checked) return;
  if (e.currentTarget.checked) {
    labelingDiv.querySelector('.result').style.setProperty('--font-size', document.getElementById('fontSize').value+'rem');
    const defFont = document.getElementById('defFont-labeling').value;
    labelingDiv.querySelectorAll('.file').forEach(file=>previewFont(file, file.innerText, defFont));
  } else {
    labelingDiv.querySelector('.result').style.setProperty('--font-size', null);
    labelingDiv.querySelectorAll('.file').forEach(file=>previewFont(file, null));
  }
});

// default font
document.getElementById('defFont-labeling').addEventListener('change', (e) => {
  if (!typeRadio_font_labeling.checked) return;
  if (!prevFontCheckbox_labeling.checked) return;
  labelingDiv.querySelectorAll('.file').forEach(file=>previewFont(file, file.innerText, e.currentTarget.value));
});

// font size
document.getElementById('fontSize').addEventListener('change', (e) => {
  if (!typeRadio_font_labeling.checked) return;
  if (!prevFontCheckbox_labeling.checked) return;
  labelingDiv.querySelector('.result').style.setProperty('--font-size',e.currentTarget.value+'rem');
});

// new folder
document.getElementById('newFolder').addEventListener('dragstart', dragStartNewFolder);
document.getElementById('newFolder').addEventListener('dragend', dragEnd);

// to top/bottom of all/group
['2topAll', '2bottomAll', '2topGroup', '2bottomGroup'].forEach(id => {
  const target = document.getElementById(id);
  target.addEventListener('dragenter', dragEnter);
  target.addEventListener('dragleave', dragLeave);
  target.addEventListener('dragover', dragOver);
  target.addEventListener('drop', dropMove);
});

// 開閉
document.getElementById('toggleDetails').addEventListener('click', e => {
  if (e.currentTarget.dataset.toggle=='close') {
    labelingDiv.querySelectorAll('details').forEach(details => details.open=false);
    e.currentTarget.dataset.toggle = 'open';
  } else {
    labelingDiv.querySelectorAll('details').forEach(details => details.open=true);
    e.currentTarget.dataset.toggle = 'close';
  }
});

// 選択をクリア
document.getElementById('clearChoice').addEventListener('click', ()=> 
  labelingDiv.querySelectorAll('.choice').forEach(el=>el.classList.remove('choice'))
);

// sort result
document.getElementById('sortByLabel').addEventListener('click', () => {
  sortByLabel(labelingDiv.querySelector('.result'));
  numbering();
});



// ------------------
//   main function
// ------------------
async function readIniFile() {
  const file = document.getElementById('iniInput').files[0];
  if (!file) return;

  // initialize
  rawDataArr.splice(0);
  backupArr.splice(0);
  systemArr.splice(0);

  // read file
  const text = await file.text();
  const arr = text.replaceAll('\r\n','\n').split(/^\[/mg).filter(Boolean);
  arr.forEach(el => {
    if (/^(?:Color|Effect|Font|Movement|Params)\..+/.test(el)) {
      const splitArr = el.trim().split('\n');
      const {type, name} = splitArr.shift().match(/(?<type>.+?)\.(?<name>.+?)]$/).groups;
      const dic = {checked:false, type:type, name:name, props:{}};
      
      if (packageDic.Movement.size > 0) {
        if (packageDic[type] && !packageDic[type].has(name)) dic.checked = true;
      }

      splitArr.forEach(row => {
        let {key, value} = row.match(/(?<key>.+?)=(?<value>.*)/).groups;
        if (key=='label') value=value.split('\\').filter(Boolean);
        else if (key=='hide'||key=='order') value = parseInt(value);
        dic.props[key] = value;
      });
      dic.defOrder = dic.props.order;
      rawDataArr.push(dic);
    } else {
      systemArr.push('['+el.trim());
    }
  });

  backupArr = structuredClone(rawDataArr);

  // set fonts to select
  const fontArr = rawDataArr.filter(dic=>dic.type=='Font').map(dic => previewFont(null, dic.name)).sort();
  const selectLabeling = document.getElementById('defFont-labeling');
  const selectDelDup = document.getElementById('defFont-delDup');    
  selectLabeling.innerHTML = '';
  selectDelDup.innerHTML = '';
  new Set(fontArr).forEach(font => {
    const option1 = document.createElement('option');
    const option2 = document.createElement('option');
    option1.innerText = font;
    option2.innerText = font;
    selectLabeling.appendChild(option1);
    selectDelDup.appendChild(option2);
  });
}


async function readPackage(e) {
  const files = e.currentTarget.files;
  if (!files?.length) return;

  // initialize packageDic
  packageDic.Movement.clear();
  packageDic.Params.clear();
  packageDic.Effect.clear();
  
  // add default package
  defValJson.defMovement.forEach(name => packageDic.Movement.add(name));
  defValJson.defParams.forEach(name => packageDic.Params.add(name));
  defValJson.defEffect.forEach(name => packageDic.Effect.add(name));

  // add packages to packageDic
  await Promise.all(Array.from(files, async file => {
    const {filename, extension} = file.name.match(/(?<filename>.+)\.(?<extension>.+?)$/)?.groups;
    
    if (!/^(?:anm2?|cam2?|scn2?|obj2?|tra2?|object|params)$/.test(extension)) return;

    if (extension==='params') {
      const text = await file.text();
      text.split('\r\n').filter(Boolean).forEach(row => {
        if (row.charAt(0)===';') return;
        const paramname = row.match(/^(.+)=[\d\-., ]*$/)?.[1];
        packageDic.Params.add(`${paramname}@${filename}`);
      });

    } else if (extension==='object') {
      packageDic.Effect.add(`object.${filename}`);

    // anm2?|cam2?|scn2?|obj2?|tra2?
    } else {
      const addTargetSet = packageDic[/^tra2?$/.test(extension) ? 'Movement' : 'Effect'];

      if (filename==='script') {
        let text;
        if (extension.endsWith('2')) text = await file.text();
        else text = new TextDecoder('shift_jis').decode(await file.arrayBuffer());
        text.match(/(?<=^@).+$/mg).forEach(packagename => addTargetSet.add(packagename));

      } else if (filename.charAt(0)==='@') {
        let text;
        if (extension.endsWith('2')) text = await file.text();
        else text = new TextDecoder('shift_jis').decode(await file.arrayBuffer());
        text.match(/(?<=^@).+$/mg).forEach(packagename => addTargetSet.add(packagename+filename));
        
      } else {
        addTargetSet.add(filename);
      }
    }
  }));
  
  rawDataArr.forEach(dic => {
    if (packageDic[dic.type] && !packageDic[dic.type].has(dic.name)) dic.checked = true;
  });
  return;
}


function saveFile() {
  const dataArr = rawDataArr.filter(dic=>!dic.checked);
  if (!dataArr.length) return;

  // sort
  const sort = (dataArr, sortStyle, isAsc) => {
    const sign = isAsc ? 1 : -1;
    if (sortStyle==='none') return;
    else if (sortStyle==='order') {
      dataArr.sort((a, b) => sign * (a.props.order-b.props.order));
    } else if (['checked','type','name'].includes(sortStyle)) {
      dataArr.sort((a, b) => sign * (a[sortStyle] > b[sortStyle] ? 1 : -1));
    }
  };
  sort(dataArr, 'order', false);
  sort(dataArr, 'type', true);

  // result
  let result = systemArr.join('\n') + '\n';
  dataArr.forEach(dic => {
    result += `[${dic.type}.${dic.name}]\n`;
    for (const key in dic.props) {
      const value = (key=='label') ? dic.props[key].join('\\') : dic.props[key];
      result += `${key}=${value}\n`;
    }
  });

  // save
  const blob = new Blob([result.trim().replaceAll('\n','\r\n')], {type:'text/plain'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'aviutl2.ini';
  link.click();
}


function showResult_delDup() {
  // initialize
  const tbody = deleteDupDiv.querySelector('table tbody');
  tbody.innerHTML = '';
  
  const type = deleteDupDiv.querySelector('[name=type-delDup]:checked').value;
  const dataArr = rawDataArr.filter(dic => dic.type==type);

  // sort
  const sort = (dataArr, sortStyle, isAsc) => {
    const sign = isAsc ? 1 : -1;
    if (['name','checked','defOrder'].includes(sortStyle)) {
      dataArr.sort((a, b) => sign * (a[sortStyle] > b[sortStyle] ? 1 : -1));
    } else if (sortStyle==='order') {
      dataArr.sort((a, b) => sign*(a.props.order-b.props.order));
    }
  };
  const sortStyle = document.getElementById('sortStyle').value;
  sort(dataArr, sortStyle, true);
  
  // show
  const defFont = document.getElementById('defFont-delDup').value;
  const previewFontFlag = type=='Font' && prevFontCheckbox_deldup.checked;

  dataArr.forEach(data => {
    const order = sortStyle=='defOrder' ? data.defOrder : (data.props.order ?? null);
    let props = '';
    for (const key in data.props) {
      const value = key=='label' ? data.props[key].join('\\') : data.props[key];
      props += `${key}=${value}\n`;
    }
    
    const row = addRow(tbody, [null, order, data.name, props.trim()]);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = data.checked;
    row.firstElementChild.appendChild(input);

    if (previewFontFlag) previewFont(row.children[2], data.name, defFont);

    if (packageDic[type]?.size) {
      if (!packageDic[type].has(data.name)) row.className = 'uninstalled';
    } else {
      if (dataArr.filter(dic=>dic.defOrder==data.defOrder).length>1) row.className = 'duplicate';
    }

    row.addEventListener('click', (e)=>{
      const input = e.currentTarget.firstElementChild.firstElementChild;
      input.checked = !input.checked;
      dataArr[e.currentTarget.sectionRowIndex].checked = input.checked;
    });
  });
}


function showResult_labeling() {
  const type = labelingDiv.querySelector('[name=type-labeling]:checked').value;
  const previewFontFlag = type=='Font' && prevFontCheckbox_labeling.checked;

  // initialize
  document.getElementById('toggleDetails').dataset.toggle = 'close';
  const resultDiv = labelingDiv.querySelector('.result');
  resultDiv.innerHTML = '';
  resultDiv.style.setProperty('--font-size', previewFontFlag ? document.getElementById('fontSize').value+'rem' : null);

  // sort
  const dataArr = rawDataArr
    .filter(dic=>dic.type==type&&!dic.checked)
    .sort((a,b)=>a.props.order-b.props.order);

  // add packages
  dataArr.forEach(dic => {
    let target = resultDiv;
    dic.props.label.forEach(label => {
      target = [...target.querySelectorAll('&>.folder>summary input')].filter(input=>input.value==label)?.[0]?.closest('.folder').lastElementChild || createFolderEl(target, label).lastElementChild;
    });

    const file = createFileEl(null, dic.name, dic.props.hide===1);
    if (previewFontFlag) previewFont(file, dic.name, document.getElementById('defFont-labeling').value);
    target.appendChild(file);
  });

  // numbering
  numbering();
}


let preType = labelingDiv.querySelector('[name=type-labeling]:checked').value;
function updateOrder() {
  const dataArr = rawDataArr.filter(dic=>dic.type==preType && !dic.checked);
  [...labelingDiv.querySelectorAll('.result .file')].forEach((file,i) => {
    const name = file.lastChild.textContent;
    const dic = dataArr.filter(dic=>dic.name==name)[0];

    const label = [];
    let target = file;
    while (target.closest('.folder')) {
      target = target.closest('.folder');
      const title = target.querySelector('summary input').value;
      if (title) label.unshift(title);
      target = target.parentElement;
    }
    dic.props.order = i;
    dic.props.label = label;
  });
  preType = labelingDiv.querySelector('[name=type-labeling]:checked').value;
}


function sortByLabel (target) {
  const files   = [...target.querySelectorAll('& > .file')];
  const folders = [...target.querySelectorAll('& > .folder')];
  const isAsc = document.getElementById('isAsc').checked ? 1 : -1;

  // sort
  files.sort((a,b) => {
    if (a.innerText > b.innerText) return isAsc;
    else return -isAsc;
  });
  folders.sort((a,b)=> {
    const aLabel = a.querySelector('summary input').value;
    const bLabel = b.querySelector('summary input').value;
    if (aLabel > bLabel) return 1;
    else return -1;
  });

  // insert
  if (document.getElementById('folderIsBottom').checked) {
    files.forEach(file=>target.appendChild(file));
    folders.forEach(folder=>target.appendChild(folder));
  } else {
    folders.forEach(folder=>target.appendChild(folder));
    files.forEach(file=>target.appendChild(file));
  }

  // sort inner folders
  folders.forEach(folder=>sortByLabel(folder.lastElementChild));
}



// ------------------
//   event listener
// ------------------
function dragOver (e) {e.preventDefault()};

// drop to iniInput
const iniInput = document.getElementById('iniInput').previousElementSibling;
iniInput.addEventListener('dragenter', (e) => e.currentTarget.classList.add('target'));
iniInput.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('target'));
iniInput.addEventListener('dragover', dragOver);
iniInput.addEventListener('drop', drop2iniInput);
function drop2iniInput (e) {
  e.preventDefault();
  e.currentTarget.classList.remove('target');
  document.getElementById('iniInput').files = e.dataTransfer.files;
  document.getElementById('iniInput').dispatchEvent(new Event('change'));
}

function dragStartNewFolder (e) {e.dataTransfer.setData('text/process', 'new');}
function dragStartFolder (e) {
  e.stopPropagation();
  e.dataTransfer.setData('text/process', 'existing');
  e.dataTransfer.setData('text/type', 'folder');
  e.dataTransfer.setData('text/index', e.currentTarget.dataset.index);
}
function dragStartFile (e) {
  e.stopPropagation();
  e.dataTransfer.setData('text/process', 'existing');
  e.dataTransfer.setData('text/type', 'file');
  e.dataTransfer.setData('text/index', e.currentTarget.dataset.index);
}


function dragEnter (e) {
  e.stopPropagation();
  if (e.ctrlKey) e.currentTarget.classList.add('choice');
  else {
    labelingDiv.querySelectorAll(':is(.target,.target-down)').forEach(el=>el.classList.remove('target','target-down'));
    e.currentTarget.classList.add('target');
  }
}
function dragLeave (e) {
  if (e.relatedTarget?.tagName=='INPUT') return;
  if (e.ctrlKey) return;
  e.stopPropagation();
  const el = e.currentTarget;
  el.classList.remove('target');
  if (el.parentElement.classList.contains('result') && !el.nextElementSibling && e.offsetY>0)
    el.classList.add('target-down');
}
function dragEnterBody (e) {
  e.stopPropagation();
  if (e.ctrlKey) return;
  e.currentTarget.classList.add(e.offsetY>8 ? 'target-down' : 'target');
}
function dragLeaveBody (e) {
  e.stopPropagation();
  if (e.ctrlKey) return;
  e.currentTarget.classList.remove('target', 'target-down');
}


function drop (e) {
  if (e.ctrlKey) return;
  // 差し込み元のファイル
  let srcDiv;
  if (e.dataTransfer.getData('text/process')=='new') {
    srcDiv = createFolderEl();
  } else {
    const type = e.dataTransfer.getData('text/type');
    const index = e.dataTransfer.getData('text/index');
    srcDiv = labelingDiv.querySelector(`.${type}[data-index="${index}"]`);
  }
  // insert
  if (srcDiv.classList.contains('choice')) {
    const srcDivs = labelingDiv.querySelectorAll('.choice');
    srcDivs.forEach(el=>{
      if (el.parentElement.closest('.choice')) return;
      if (!el.contains(e.currentTarget)) e.currentTarget.before(el);
    });
    srcDivs.forEach(el=>el.classList.remove('choice'));
  } else {
    if (!srcDiv.contains(e.currentTarget)) e.currentTarget.before(srcDiv);
  }
  numbering();
  e.currentTarget.classList.remove('target', 'target-down');
  e.stopPropagation();
}
function drop2body (e) {
  if (e.ctrlKey) return;
  // 差し込み元のファイル
  let srcDiv;
  if (e.dataTransfer.getData('text/process')=='new') {
    srcDiv = createFolderEl();
  } else {
    const type  = e.dataTransfer.getData('text/type');
    const index = e.dataTransfer.getData('text/index');
    srcDiv = labelingDiv.querySelector(`.${type}[data-index="${index}"]`);
  }
  // insert
  const cur = e.currentTarget;

  if (srcDiv.classList.contains('choice')) {
    const srcDivs = labelingDiv.querySelectorAll('.choice');

    if (cur.classList.contains('target')) {
      [...srcDivs].reverse().forEach(el=>{
        if (el.parentElement.closest('.choice')) return;
        if (!el.contains(cur)) cur.insertAdjacentElement('afterbegin',el);
      });

    } else if (cur.classList.contains('target-down')) {
      srcDivs.forEach(el=>{
        if (el.parentElement.closest('.choice')) return;
        if (!el.contains(cur)) cur.appendChild(el);
      });
    }
    srcDivs.forEach(el=>el.classList.remove('choice'));
  } else {
    if (!srcDiv.contains(cur)) {
      if (cur.classList.contains('target')) cur.insertAdjacentElement('afterbegin',srcDiv);
      else if (cur.classList.contains('target-down')) cur.appendChild(srcDiv);
    }
  }
  numbering();
  e.currentTarget.classList.remove('target', 'target-down');
  e.stopPropagation();
}
function dragEnd (e) {
  if (e.ctrlKey) return;
  // 差し込み先
  const dstDiv = labelingDiv.querySelector('.result > .target-down:last-child');
  if (!dstDiv) return;
  // 差し込み元
  let srcDiv = e.currentTarget.id=='newFolder' ? createFolderEl() : e.currentTarget;
  // insert
  if (srcDiv.classList.contains('.choice')) {
    const srcDivs = labelingDiv.querySelectorAll('.choice');
    [...srcDivs].reverse().forEach(el=>{if(!el.parentElement.closest('.choice')) dstDiv.after(el)});
    srcDivs.forEach(el=>el.classList.remove('choice'));
  } else dstDiv.after(srcDiv);
  numbering();
  dstDiv.classList.remove('target-down');
  e.stopPropagation();
}
function dropMove(e) {
  // 差し込み元のファイル
  let srcDiv;
  if (e.dataTransfer.getData('text/process')=='new') {
    srcDiv = createFolderEl();
  } else {
    const type = e.dataTransfer.getData('text/type');
    const index = e.dataTransfer.getData('text/index');
    srcDiv = labelingDiv.querySelector(`.${type}[data-index="${index}"]`);
  }
  // insert
  const resultDiv = labelingDiv.querySelector('.result');
  const add = (el) => {
    const parentGroup = el.parentElement.closest('.folder')?.lastElementChild ?? resultDiv;
    if      (e.currentTarget.id==='2topAll')      resultDiv.insertAdjacentElement('afterbegin', el);
    else if (e.currentTarget.id==='2bottomAll')   resultDiv.appendChild(el);
    else if (e.currentTarget.id==='2topGroup')    parentGroup.insertAdjacentElement('afterbegin', el);
    else if (e.currentTarget.id==='2bottomGroup') parentGroup.appendChild(el);
    // switch (e.currentTarget.id) {
    //   case '2topAll':
    //     resultDiv.insertAdjacentElement('afterbegin', el);
    //     break;
    //   case '2bottomAll':
    //     resultDiv.appendChild(el);
    //     break;
    //   case '2topGroup':
    //     parentGroup.insertAdjacentElement('afterbegin', el);
    //     break;
    //   case '2bottomGroup':
    //     parentGroup.appendChild(el);
    //     break;
    // }
  };

  if (srcDiv.classList.contains('choice')) {
    const srcDivs = labelingDiv.querySelectorAll('.choice');
    if (e.currentTarget.id.includes('top')) {
      [...srcDivs].reverse().forEach(el=>{if(!el.parentElement.closest('.choice')) add(el)});
    } else {
      srcDivs.forEach(el=>{if(!el.parentElement.closest('.choice')) add(el)});
    }
    srcDivs.forEach(el=>el.classList.remove('choice'));
  } else {
    add(srcDiv);
  }

  e.currentTarget.classList.remove('target');
  numbering();
}


// ungroup
function ungroupFolder (e) {
  const targetFolder = e.currentTarget.closest('.folder');
  const nextElement  = targetFolder.nextElementSibling;
  if (nextElement) {
    targetFolder.querySelectorAll('&>:last-child>*').forEach(el=>nextElement.before(el));
  } else {
    const parentElement = targetFolder.parentElement;
    targetFolder.querySelectorAll('&>:last-child>*').forEach(el=>parentElement.appendChild(el));
  }
  targetFolder.remove();
  return;
}

function toggleHide (e) {
  if (e.ctrlKey) return;
  e.currentTarget.classList.toggle('hide');
  const name = e.currentTarget.lastChild.textContent;
  const type = labelingDiv.querySelector('[name=type-labeling]:checked').value;
  const dic = rawDataArr.filter(dic=>dic.type==type && dic.name==name)[0];
  dic.props.hide = Number(e.currentTarget.classList.contains('hide'));
}

function ctrlClick (e) {
  if (!e.ctrlKey) return;
  e.currentTarget.classList.toggle('choice');
  e.stopPropagation();
}



// ------------------------
//   汎用関数
// ------------------------
function numbering () {
  labelingDiv.querySelectorAll('.file').forEach  ((el,i) => el.dataset.index=i);
  labelingDiv.querySelectorAll('.folder').forEach((el,i) => el.dataset.index=i);
}

function previewFont (element=null, fontName=null, defFont=null) {
  if (!fontName) {
    if (element) {
      element.style.setProperty('font-family', null);
      element.style.setProperty('font-weight', null);
      element.style.setProperty('font-stretch', null);
    }
    return null;
  } else {
    // weight
    for (const key in defValJson.fontWeightDic) {
      const regExp = new RegExp(` ${key}\\b`,'i');
      if (regExp.test(fontName)) {
        if (element) element.style.fontWeight = defValJson.fontWeightDic[key];
        fontName = fontName.replace(regExp,'');
        break;
      }
    }
    // condensed
    for (const key in defValJson.fontCondDic) {
      const regExp = new RegExp(` ${key}\\b`,'i');
      if (regExp.test(fontName)) {
        if (element) element.style.fontStretch = defValJson.fontCondDic[key];
        fontName = fontName.replace(regExp,'');
        break;
      }
    }
    if (element) element.style.fontFamily = `"${fontName}"` + (defFont ? `, "${defFont}"` : '');
    return fontName;
  }
}

function createFileEl(parent=null, label=null, hide=false) {
  const file = document.createElement('p');
  file.classList.add('file');
  if (hide) file.classList.add('hide');
  file.draggable = true;

  const icon = document.createElement('span');
  icon.classList.add('material-symbols-outlined','hover');
  icon.innerText = 'drag_indicator';

  file.appendChild(icon);
  file.appendChild(document.createTextNode(label));
  
  file.addEventListener('dragstart', dragStartFile);
  file.addEventListener('dragend', dragEnd);
  file.addEventListener('dragenter', dragEnter);
  file.addEventListener('dragleave', dragLeave);
  file.addEventListener('dragover', dragOver);
  file.addEventListener('drop', drop);
  
  file.addEventListener('click',toggleHide);
  file.addEventListener('click', ctrlClick);

  if (parent) parent.appendChild(file);
  return file;
}

function createFolderEl(parent=null, label=null) {
  const folder = document.createElement('details');
  folder.classList.add('folder');
  folder.draggable = true;
  folder.open = true;

  const summary = document.createElement('summary');
  
  const indicator = document.createElement('span');
  indicator.classList.add('material-symbols-outlined','hover');
  indicator.innerText = 'drag_indicator';

  const titleDiv = document.createElement('div');
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = label;

  const ungroupBtn = document.createElement('button');
  const btnIcon = document.createElement('div');
  ungroupBtn.classList.add('icon-frame');
  btnIcon.classList.add('icon','icon-close');
  
  const body = document.createElement('div');
  
  folder.addEventListener('dragstart', dragStartFolder);
  folder.addEventListener('dragend', dragEnd);

  folder.addEventListener('dragenter', dragEnter);
  folder.addEventListener('dragleave', dragLeave);
  folder.addEventListener('dragover', dragOver);
  folder.addEventListener('drop', drop);

  folder.addEventListener('click', ctrlClick)

  body.addEventListener('dragenter', dragEnterBody);
  body.addEventListener('dragleave', dragLeaveBody);
  body.addEventListener('dragover', dragOver);
  body.addEventListener('drop', drop2body);

  ungroupBtn.addEventListener('click', ungroupFolder);
  
  ungroupBtn.appendChild(btnIcon);
  titleDiv.appendChild(titleInput);
  titleDiv.appendChild(ungroupBtn);
  summary.appendChild(indicator);
  summary.appendChild(titleDiv);
  folder.appendChild(summary);
  folder.appendChild(body);
  if (parent) parent.appendChild(folder);
  return folder;
}

/**
 * 指定のテーブルに行を追加する関数
 * @param {HTMLTableSectionElement} parent 行を追加するエレメント(theader or tbody)
 * @param {Array || Int} content 追加する内容(forEach持ち) or 列数
 * @param {Number} thCol ヘッダーにする列の列数 デフォルトは-1(ヘッダーセルを作らない)
 * @returns {HTMLTableRowElement} 追加した行エレメント
 */
function addRow(parent, content, thCol=-1) {
  if (!parent || !content) return;
  if (Number.isInteger(content)) content = Array(content).fill(null);
  const row = document.createElement('tr');
  content.forEach((value,i) => {
    const cell = document.createElement(i==thCol ? 'th' : 'td');
    cell.innerHTML = value ?? null;  // nullとundefinedだけ空にする
    row.appendChild(cell);
  });
  parent.appendChild(row);
  return row;
}
