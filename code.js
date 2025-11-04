
let rawDataArr = [];
let systemArr = [];

const deleteDupDiv = document.querySelector('[data-process=deleteDup]');
const labelingDiv  = document.querySelector('[data-process=labeling]');


// ---------------------
//   ページ切り替え
// ---------------------
document.querySelectorAll('input[name=process]').forEach(input=> {
  input.addEventListener('click', (e) => {
    document.querySelector('div.active[data-process]')?.classList.remove('active');
    document.querySelector(`div[data-process=${e.currentTarget.value}]`).classList.add('active');
  });
});

// order, labelの更新
document.querySelectorAll('input[name=process]').forEach(input=>input.addEventListener('change', updateOrder));
document.querySelectorAll('input[name=type-labeling]').forEach(input=>input.addEventListener('change', updateOrder));

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


// ---------------------
//   iniファイル選択時
// ---------------------
document.querySelectorAll('.clickNextInput').forEach(el => {
  el.addEventListener('click', (e) => e.currentTarget.nextElementSibling?.click());
});
document.getElementById('iniInput').addEventListener('change', async () => {
  if (document.querySelector('[data-process=home].active')) {
    document.querySelector('[data-process].active')?.classList.remove('active');
    document.querySelector('input[name=process][value=labeling]').checked = true;
    labelingDiv.classList.add('active');
  }
  await readFile();
  if (document.querySelector('input[name=process][value=labeling]:checked')) showFolder();
  else showDeleteDupResult();
});
document.getElementById('back2readPt').addEventListener('click', async () => {
  await readFile();
  if (document.querySelector('input[name=process][value=labeling]:checked')) showFolder();
  else showDeleteDupResult();
});
document.getElementById('back2savePt').addEventListener('click', () => {
  if (document.querySelector('input[name=process][value=labeling]:checked')) showFolder();
  else showDeleteDupResult();
});
document.getElementById('clear').addEventListener('click', () => {
  rawDataArr = [];
  systemArr = [];
  deleteDupDiv.querySelector('table tbody').innerHTML = '';
  labelingDiv.querySelector('.result').innerHTML = '';
  document.getElementById('sortStyle').value = 'order';
  document.getElementById('toggleDetails').dataset.toggle = 'close';
  document.getElementById('iniInput').value = null;
});
async function readFile() {
  const file = document.getElementById('iniInput').files[0];
  if (!file) return;

  // initialize
  rawDataArr = [];
  systemArr = [];

  // read file
  const text = await file.text();
  const arr = text.replaceAll('\r\n','\n').split(/^\[/mg).filter(Boolean);
  arr.forEach(el => {
    if (/^(?:Color|Effect|Font|Input|Movement|Output|Params)\..+/.test(el)) {
      const splitArr = el.trim().split('\n');
      
      const {type, name} = splitArr.shift().match(/(?<type>.+?)\.(?<name>.+?)]/).groups;
      const dic = {checked:false, type:type, name:name, props:{}};
      splitArr.forEach(row => {
        let {key, value} = row.match(/(?<key>.+?)=(?<value>.*)/).groups;
        if (key=='label') value=value.split('\\').filter(Boolean);
        if (['hide','order','priority'].includes(key)) value = parseInt(value);
        dic.props[key] = value;
      });
      dic.defOrder = dic.props.order ?? dic.props.priority;
      rawDataArr.push(dic);
    } else {
      systemArr.push('['+el.trim());
    }
  });

  // set fonts to select
  const fontArr = rawDataArr.filter(dic=>dic.type=='Font').map(dic => previewFont(null, dic.name)).sort();
  new Set(fontArr).forEach(font => {
    const selectLabeling = document.getElementById('defFont-labeling');
    const selectDelDup = document.getElementById('defFont-delDup');    
    const option1 = document.createElement('option');
    const option2 = document.createElement('option');
    option1.innerText = font;
    option2.innerText = font;
    selectLabeling.appendChild(option1);
    selectDelDup.appendChild(option2);
  });
}


// ---------------------
//   結果保存
// ---------------------
document.getElementById('copy').addEventListener('click', updateOrder);
document.getElementById('copy').addEventListener('click', saveFile);
function saveFile() {
  const dataArr = rawDataArr.filter(dic=>!dic.checked);
  if (!dataArr.length) return;

  // sort
  const sort = (dataArr, sortStyle, isAsc) => {
    const sign = isAsc ? 1 : -1;
    switch (sortStyle) {
      case 'none':
        break;
      case 'type':
      case 'name':
      case 'checked':
        dataArr.sort((a, b) => {
          if (a[sortStyle] > b[sortStyle]) return sign;
          else return -sign;
        });
        break;
      case 'order':
        dataArr.sort((a, b) => {
          const aOrder = a.props[a.type=='Input' ? 'priority' : 'order'];
          const bOrder = b.props[b.type=='Input' ? 'priority' : 'order'];
          if (aOrder > bOrder) return sign;
          else return -sign;
        });
        break;
    }
  };
  sort(dataArr, 'type', false);
  sort(dataArr, 'order', true);

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


// ---------------------
//   重複を削除　ページ
// ---------------------
document.querySelector('input[name=process][value=deleteDup]').addEventListener('click',showDeleteDupResult);
deleteDupDiv.querySelectorAll('input[name=type-delDup]').forEach(input => input.addEventListener('change', showDeleteDupResult));
document.getElementById('sortStyle').addEventListener('change', showDeleteDupResult);
// フォントプレビュー
document.getElementById('previewFont-delDup').addEventListener('change', () => {
  if (deleteDupDiv.querySelector('[name=type-delDup][value=Font]:checked')) showDeleteDupResult();
});
document.getElementById('defFont-delDup').addEventListener('change', () => {
  if (document.getElementById('previewFont-delDup').checked && deleteDupDiv.querySelector('[name=type-delDup][value=Font]:checked')) showDeleteDupResult();
});

function showDeleteDupResult() {
  // initialize
  const tbody = deleteDupDiv.querySelector('table tbody');
  tbody.innerHTML = '';
  
  const type = deleteDupDiv.querySelector('[name=type-delDup]:checked').value;
  const dataArr = rawDataArr.filter(dic => dic.type==type);

  // sort
  const sort = (dataArr, sortStyle, isAsc) => {
    const sign = isAsc ? 1 : -1;
    switch (sortStyle) {
      case 'name':
      case 'checked':
        dataArr.sort((a, b) => {
          if (a[sortStyle] > b[sortStyle]) return sign;
          else return -sign;
        });
        break;
      case 'defOrder':
        dataArr.sort((a, b) => sign*(a[sortStyle]-b[sortStyle]));
        break;
      case 'order':
        dataArr.sort((a, b) => {
          const aOrder = a.props[a.type=='Input' ? 'priority' : 'order'];
          const bOrder = b.props[b.type=='Input' ? 'priority' : 'order'];
          return sign*(aOrder-bOrder);
        });
        break;
    }
  };
  const sortStyle = document.getElementById('sortStyle').value;
  sort(dataArr, sortStyle, true);

  
  // show
  dataArr.forEach(data => {
    const order = sortStyle=='defOrder' ? data.defOrder : (data.props.order ?? data.props.priority ?? null);
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

    if (deleteDupDiv.querySelector('[name=type-delDup][value=Font]:checked') && 
      document.getElementById('previewFont-delDup').checked
    ) {
      previewFont(row.children[2], data.name, document.getElementById('defFont-delDup').value);
    }

    if (dataArr.filter(dic=>dic.type==data.type && dic.defOrder==data.defOrder).length>1) 
      row.className = 'duplicate';

    row.addEventListener('click', (e)=>{
      const input = e.currentTarget.firstElementChild.firstElementChild;
      input.checked = !input.checked;
      dataArr[e.currentTarget.sectionRowIndex].checked = input.checked;
    });
  });
}


// ---------------------
//   ラベリング　ページ
// ---------------------

/* 
変更の保存タイミング：
- タブを切り替えた時
- 種類を切り替えた時

セーブポイント:
- 読み込み時の状態
- 前回保存時の状態
 */

// タブ部分
document.querySelector('input[name=process][value=labeling]').addEventListener('click', showFolder);
// 対象選択
labelingDiv.querySelectorAll('input[name=type-labeling]').forEach(el=>el.addEventListener('change', showFolder));
// フォントプレビュー
document.getElementById('previewFont-labeling').addEventListener('change', () => {
  if (labelingDiv.querySelector('[name=type-labeling][value=Font]:checked')) showFolder();
});
document.getElementById('defFont-labeling').addEventListener('change', () => {
  if (document.getElementById('previewFont-labeling').checked && labelingDiv.querySelector('[name=type-labeling][value=Font]:checked')) showFolder();
});

function showFolder() {
  // initialize
  document.getElementById('toggleDetails').dataset.toggle = 'close';
  const resultDiv = labelingDiv.querySelector('.result');
  resultDiv.innerHTML = '';

  // sort
  const type = labelingDiv.querySelector('[name=type-labeling]:checked').value;
  const dataArr = rawDataArr.filter(dic=>dic.type==type&&!dic.checked).sort((a,b)=>
    type=='Input' ? a.props.priority - b.props.priority : a.props.order - b.props.order
  );

  // add packages
  dataArr.forEach(dic => {
    let target = resultDiv;
    dic.props.label.forEach(label => {
      target = [...target.querySelectorAll('summary input')].filter(input=>input.value==label)?.[0]?.closest('.folder').lastElementChild || makeFolderDiv(target, label).lastElementChild;
    });
    const file = document.createElement('p');
    file.classList.add('file');
    if (dic.props.hide==1) file.classList.add('hide');
    file.draggable = true;

    const icon = document.createElement('span');
    icon.classList.add('material-symbols-outlined','hover');
    icon.innerText = 'drag_indicator';

    file.appendChild(icon);
    file.appendChild(document.createTextNode(dic.name));
    
    file.addEventListener('dragstart', dragStartFile);
    file.addEventListener('dragend', dragEnd);
    file.addEventListener('dragenter', dragEnter);
    file.addEventListener('dragleave', dragLeave);
    file.addEventListener('dragover', dragOver);
    file.addEventListener('drop', drop);
    
    file.addEventListener('click',toggleHide);
    file.addEventListener('click', ctrlClick);
    
    // font preview
    if (type=='Font' && document.getElementById('previewFont-labeling').checked)
      previewFont(file, dic.name, document.getElementById('defFont-labeling').value);
    
    target.appendChild(file);
  });

  // numbering
  numbering();
}

// new folder
document.getElementById('newFolder').addEventListener('dragstart', dragStartNewFolder);
document.getElementById('newFolder').addEventListener('dragend', dragEnd);

// to top/bottom of all/group
document.getElementById('2topAll').addEventListener     ('dragenter', dragEnter);
document.getElementById('2bottomAll').addEventListener  ('dragenter', dragEnter);
document.getElementById('2topGroup').addEventListener   ('dragenter', dragEnter);
document.getElementById('2bottomGroup').addEventListener('dragenter', dragEnter);
document.getElementById('2topAll').addEventListener     ('dragLeave', dragLeave);
document.getElementById('2bottomAll').addEventListener  ('dragLeave', dragLeave);
document.getElementById('2topGroup').addEventListener   ('dragLeave', dragLeave);
document.getElementById('2bottomGroup').addEventListener('dragLeave', dragLeave);
document.getElementById('2topAll').addEventListener     ('dragover', dragOver);
document.getElementById('2bottomAll').addEventListener  ('dragover', dragOver);
document.getElementById('2topGroup').addEventListener   ('dragover', dragOver);
document.getElementById('2bottomGroup').addEventListener('dragover', dragOver);
document.getElementById('2topAll').addEventListener     ('drop', dropMove);
document.getElementById('2bottomAll').addEventListener  ('drop', dropMove);
document.getElementById('2topGroup').addEventListener   ('drop', dropMove);
document.getElementById('2bottomGroup').addEventListener('drop', dropMove);


// numbering
function numbering () {
  labelingDiv.querySelectorAll('.file').forEach  ((el,i) => el.dataset.index=i);
  labelingDiv.querySelectorAll('.folder').forEach((el,i) => el.dataset.index=i);
}

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
document.getElementById('clearChoice').addEventListener('click', ()=> {
  labelingDiv.querySelectorAll('.choice').forEach(el=>el.classList.remove('choice'));
});

// sort result
document.getElementById('sortByLabel').addEventListener('click', () => {
  sortByLabel(labelingDiv.querySelector('.result'));
  numbering();
});
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

function dragStartNewFolder (e) {
  e.dataTransfer.setData('text/process', 'new');
}
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
  labelingDiv.querySelectorAll(':is(.target,.target-down)').forEach(el=>el.classList.remove('target','target-down'));
  e.currentTarget.classList.add('target');
}
function dragLeave (e) {
  if (e.relatedTarget?.tagName=='INPUT') return;
  e.stopPropagation();
  const el = e.currentTarget;
  el.classList.remove('target');
  if (el.parentElement.classList.contains('result') && !el.nextElementSibling && e.offsetY>0)
    el.classList.add('target-down');
}
function dragEnterBody (e) {
  e.stopPropagation();
  e.currentTarget.classList.add(e.offsetY>8 ? 'target-down' : 'target');
}
function dragLeaveBody (e) {
  e.stopPropagation();
  e.currentTarget.classList.remove('target', 'target-down');
}

function drop (e) {
  // 差し込み元のファイル
  let srcDiv;
  if (e.dataTransfer.getData('text/process')=='new') {
    srcDiv = makeFolderDiv();
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
  // 差し込み元のファイル
  let srcDiv;
  if (e.dataTransfer.getData('text/process')=='new') {
    srcDiv = makeFolderDiv();
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
  // 差し込み先
  const dstDiv = labelingDiv.querySelector('.result > .target-down:last-child');
  if (!dstDiv) return;
  // 差し込み元
  let srcDiv = e.currentTarget.id=='newFolder' ? makeFolderDiv() : e.currentTarget;
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
    srcDiv = makeFolderDiv();
  } else {
    const type = e.dataTransfer.getData('text/type');
    const index = e.dataTransfer.getData('text/index');
    srcDiv = labelingDiv.querySelector(`.${type}[data-index="${index}"]`);
  }
  // insert
  const resultDiv = labelingDiv.querySelector('.result');
  const add = (el) => {
    const parentGroup = el.parentElement.closest('.folder')?.lastElementChild ?? resultDiv;
    switch (e.currentTarget.id) {
      case '2topAll':
        resultDiv.insertAdjacentElement('afterbegin', el);
        break;
      case '2bottomAll':
        resultDiv.appendChild(el);
        break;
      case '2topGroup':
        parentGroup.insertAdjacentElement('afterbegin', el);
        break;
      case '2bottomGroup':
        parentGroup.appendChild(el);
        break;
    }
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

{
  const iniInput = document.getElementById('iniInput').previousElementSibling;
  iniInput.addEventListener('dragenter', dragEnter2iniInput);
  iniInput.addEventListener('dragleave', dragLeave2iniInput);
  iniInput.addEventListener('dragover', dragOver);
  iniInput.addEventListener('drop', drop2iniInput);
}
// drop to iniInput
function dragEnter2iniInput (e) {
  e.currentTarget.classList.add('target');
}
function dragLeave2iniInput (e) {
  e.currentTarget.classList.remove('target');
}
function drop2iniInput (e) {
  e.preventDefault();
  e.currentTarget.classList.remove('target');
  document.getElementById('iniInput').files = e.dataTransfer.files;
  document.getElementById('iniInput').dispatchEvent(new Event('change'));
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
function previewFont (element=null, fontName, defFont=null) {
  const weightDic = {
    'UltraThin': 50,
    'Ultra Thin': 50,

    'Thin': 100,

    'ExtraLight': 200,
    'Extra Light': 200,
    'UltraLight': 200,
    'Ultra Light': 200,
    'EL': 200,

    'Light': 300,
    'Lt': 300,
    'L': 300,
    'W3': 300,

    'SemiLight': 350,
    'Semi Light': 350,
    'DemiLight': 350,
    'Demi Light': 350,

    'Normal': 400,
    'R': 400,
    'W4': 400,

    'Medium': 500,
    'M': 500,

    'SemiBold': 600,
    'Semi Bold': 600,
    'DemiBold': 600,
    'Demi Bold': 600,
    'Demi': 600,
    'DB': 600,
    'W6': 600,

    'ExtraBold': 800,
    'Extra Bold': 800,
    'EB': 800,
    'XBd': 800,
    'UltraBold': 800,
    'Ultra Bold': 800,
    'W8': 800,

    'Black': 900,
    'Heavy': 900,

    'Bold': 700,
    'B': 700,
  };
  const condDic = {
    'ExtraCondensed': 'extra-condensed',
    'Extra Condensed': 'extra-condensed',
    'Ext Condensed': 'extra-condensed',
    'SemiCondensed': 'semi-condensed',
    'Semi Condensed': 'semi-condensed',
    'DemiCondensed': 'semi-condensed',
    'Demi Condensed': 'semi-condensed',
    'Demi Cond': 'semi-condensed',
    'Condensed': 'condensed',
    'Cond': 'condensed',
    'Compressed': 'condensed',
    'Narrow': 'condensed',
    'Extended': 'expanded',
  };

  // weight
  for (const key in weightDic) {
    const regExp = new RegExp(` ${key}\\b`,'i');
    if (regExp.test(fontName)) {
      if (element) element.style.fontWeight = weightDic[key];
      fontName = fontName.replace(regExp,'');
      break;
    }
  }
  // condensed
  for (const key in condDic) {
    const regExp = new RegExp(` ${key}\\b`,'i');
    if (regExp.test(fontName)) {
      if (element) element.style.fontStretch = condDic[key];
      fontName = fontName.replace(regExp,'');
      break;
    }
  }
  if (element) element.style.fontFamily = '"'+fontName+'"';
  if (element && defFont) element.style.fontFamily += `, "${defFont}"`;
  return fontName;
}


function makeFolderDiv(parent=null, label=null) {
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
 * @param {HTMLTableElement} parent 行を追加するエレメント(theader or tbody)
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
