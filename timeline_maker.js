'use strict';

/* SVG 用の名前空間 */
const SVG_NS = 'http://www.w3.org/2000/svg';
/* ページの言語。日本語がデフォルト。英語 (en) のページも後で作る。 */
let LANG = 'ja';
/*  */
const PERIOD_SELECTORS = new Array(), EVENT_SELECTORS = new Array();

class period_data {
  constructor(start_year, end_year, row, color_theme) {
    this.start_year = start_year;
    this.end_year = end_year;
    this.row = row;
    this.color_theme = color_theme;
  }
  print() { console.log(JSON.stringify(this)); }
}

/*  */
var TIMELINE_DATA = TIMELINE_DATA || {
  next_period_id: 0, 
  next_event_id: 0, 
  max_row_num: 0,
  svg_width: 0, 
  svg_height: 0,
  init_state: true,
  periods: new Map(),
  events: new Map(), 
  v_bars: new Set(),
  min_year: 9999,     // 初期値
  max_year: -9999,    // 初期値
  reset_all: function () {
    this.next_period_id = 0;
    this.next_event_id = 0;
    this.max_row_num = 0;
    this.svg_width = 0;
    this.svg_height = 0;
    this.init_state = true;
    this.periods = new Map();
    this.events = new Map();
    this.v_bars = new Set();
    this.min_year = 9999;
    this.max_year = -9999;
  }
};

const CONFIG = {
  // 年の許容範囲
  min_allowable_year: -9999,
  max_allowable_year: 9999,
  // ヘッダ行の高さ
  header_row_height: 40,
  // そのうち文字用の部分の高さ (マージンを含む)
  txt_region_in_header_row: 20,
  // 左右のマージン (単位: 年)
  h_margin_in_year: 5,
  // 縦線の目盛りの間隔 (単位: 年)
  vertical_bar_interval_in_year: 25,
  // 期間を表す横棒 (実際は矩形) の高さ
  bar_height: 20,
  // その半分
  //bar_height_half: 10,
  // 期間の配置先たる各行の高さ
  row_height: 64,
  // フォントサイズ (一律)。
  font_size: 16,
  // 
  txt_dy: 16,
  // 年を等幅フォントで表示するが、その文字幅の概算値としてフォントサイズの
  // 半分を使う。
  monospace_char_width: 8,
  // 各行の上下のマージン 
  // (これは (row_height - (font_size * 2 + bar_height))/2 である)
  v_margin_within_row: 6,
  // 出来事を表す円の半径
  circle_radius: 16,
  // 年からピクセルへの変換倍率
  year_to_px_factor: 20
};

/* ページのロード (リロードも含む) の際に行う初期化。 */
window.top.onload = function () {
  // ページの言語を最初に読み込んで設定する。
  if (document.documentElement.hasAttribute('lang')) {
    LANG = document.documentElement.getAttribute('lang');
  }
  TIMELINE_DATA.reset_all();
  const m = document.menu, sel = m.which_row, L = sel.length;
  for (let i = 1; i < L; i++) {  // 2番目以降の選択肢をすべて削除
    sel.removeChild(sel.options[i]);
  }
  sel.selectedIndex = 0;
  m.reset();

/*
  if (PERIOD_SELECTORS.length === 0) {
    PERIOD_SELECTORS.push(m.   );
  }
*/
/*
  if (EVENT_SELECTORS.length === 0) {
    EVENT_SELECTORS.push(m.   );
  }
*/
  reset_svg();
  return(true);
}

/*  */
function reset_svg() {
  document.getElementById('theme_style_def').innerHTML = '';
  document.getElementById('gradient_def').innerHTML = '';
  document.getElementById('header_and_v_bars').innerHTML = '';
  document.getElementById('timeline_body').innerHTML = '';
  set_theme_defs();
}

/*  */
function set_theme_defs() {
  if (! check_theme_ids()) {
    alert('Error in themes.js.\nPlease correct themes.js.');
    return(false);
  }
  const style_elt = document.getElementById('theme_style_def'),
/*
    // このようにして CSSStyleSheet オブジェクトを取得したいが Safari は未対応
    style_sheet = style_elt.sheet,
*/
    defs_elt = document.getElementById('gradient_def'), 
    sel_elt = document.menu.color_theme;
  //console.log('style_elt: ' + style_elt);
  //console.log('style_sheet: ' + style_sheet);

  let opaque_attr, fading_attr;
  function add_grad(left_open, right_open, id) {
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    let grad_id = id;
    grad_id += (left_open ? '_open' : '_closed');
    grad_id += (right_open ? '_open' : '_closed');
    grad.setAttribute('id', grad_id);
    add_text_node(grad, '\n');
    // 左側
    const stop_0 = document.createElementNS(SVG_NS, 'stop');
    if (left_open) {
      fading_attr.push(['offset', '0%']);
      fading_attr.forEach((k_v) => { stop_0.setAttribute(k_v[0], k_v[1]); });
      fading_attr.pop();
      grad.appendChild(stop_0);  add_text_node(grad, '\n');
      const stop_15 = document.createElementNS(SVG_NS, 'stop');
      opaque_attr.push(['offset', '15%']);
      opaque_attr.forEach((k_v) => { stop_15.setAttribute(k_v[0], k_v[1]); });
      opaque_attr.pop();
      grad.appendChild(stop_15);  add_text_node(grad, '\n');
    } else {
      opaque_attr.push(['offset', '0%']);
      opaque_attr.forEach((k_v) => { stop_0.setAttribute(k_v[0], k_v[1]); });
      opaque_attr.pop();
      grad.appendChild(stop_0);  add_text_node(grad, '\n');
    }
    // 右側
    const stop_100 = document.createElementNS(SVG_NS, 'stop');
    if (right_open) {
      const stop_85 = document.createElementNS(SVG_NS, 'stop');
      opaque_attr.push(['offset', '85%']);
      opaque_attr.forEach((k_v) => { stop_85.setAttribute(k_v[0], k_v[1]); });
      opaque_attr.pop();
      grad.appendChild(stop_85);  add_text_node(grad, '\n');
      fading_attr.push(['offset', '100%']);
      fading_attr.forEach((k_v) => { stop_100.setAttribute(k_v[0], k_v[1]); });
      fading_attr.pop();
      grad.appendChild(stop_100);  add_text_node(grad, '\n');
    } else {
      opaque_attr.push(['offset', '100%']);
      opaque_attr.forEach((k_v) => { stop_100.setAttribute(k_v[0], k_v[1]); });
      opaque_attr.pop();
      grad.appendChild(stop_100);  add_text_node(grad, '\n');
    }
    // 
    add_text_node(defs_elt, '\n');
    defs_elt.appendChild(grad);
    add_text_node(defs_elt, '\n');
  }

  COLOR_THEMES.forEach(th => {
/*
    style_sheet.insertRule('circle.' + th.id + 
      '{ fill: ' + th.circle_fill + '; stroke: ' + th.circle_stroke + '; } \n');
    style_sheet.insertRule('text.' + th.id + 
      '{ fill: ' + th.text_fill + '; } \n');

    console.log('th=' + th + '(id=' + th.id + ')');
    console.log('# of rules: ' + style_sheet.cssRules.length);
*/
    const circle_rule = 'circle.' + th.id + 
       ' { fill: ' + th.circle_fill + '; stroke: ' + th.circle_stroke + '; }\n',
      text_rule = 'text.' + th.id + ' { fill: ' + th.text_fill + '; }\n';
    style_elt.innerHTML += ('\n' + circle_rule + text_rule);

    opaque_attr = [['stop-opacity', th.bar_body_opacity], 
                   ['stop-color', th.bar_color]];
    fading_attr = [['stop-opacity', th.bar_fading_end_opacity], 
                   ['stop-color', th.bar_color]];
    add_grad(true, true, th.id);
    add_grad(true, false, th.id);
    add_grad(false, true, th.id);
    add_grad(false, false, th.id);

    add_selector_option(sel_elt, th.id, th.name[LANG]);
  });
}

/*  */
function check_theme_ids() {
  // ID に重複がないことを確認
  const ids = COLOR_THEMES.map(th => { return(th.id); }).sort(),
    L = ids.length;
  for (let i = 0; i < L-1; i++) {
    if (ids[i] === ids[i+1]) { return(false); }
  }
  // ID の形式を確認
  const re = /^[a-zA-Z_]\w*$/;
  for (let i = 0; i < L; i++) {
    if (! re.test(ids[i]))  { return(false); }
  }
  // ここに来るのは問題がない場合のみ
  return(true);
}

/* 「期間を追加」メニュー。 */
function add_period() {
  const new_pid = 'p_' + TIMELINE_DATA.next_period_id++;

  const m = document.menu,
    start_year = parseInt(m.start_year.value),
    start_year_type = selected_radio_choice(m.start_year_type),
    end_year = parseInt(m.end_year.value),
    end_year_type = selected_radio_choice(m.end_year_type),
    period_label = m.period_label.value,
    which_row = parseInt(selected_choice(m.which_row)),
    color_theme = selected_choice(m.color_theme);

  m.period_label.value = m.start_year.value = m.end_year.value = '';

  if (period_label === '') {
    const msg = {ja: 'ラベルを入力してください', en: 'Enter a label.'};
    alert(msg[LANG]);  return;
  }
  if (end_year <= start_year) {
    const msg = {
      ja: '開始年より前の終了年を指定しないでください',
      en: 'Do not enter the end year that is earlier than the start year.'
    };
    alert(msg[LANG]);  return;
  }

  const svg_elt = document.getElementById('timeline'),
    timeline_body_elt = document.getElementById('timeline_body'),
    period_len = end_year - start_year,
    rect_w = period_len * CONFIG.year_to_px_factor;

  if (TIMELINE_DATA.init_state) { // これが最初の期間の追加である場合
    TIMELINE_DATA.min_year = start_year;
    TIMELINE_DATA.max_year = end_year;
    TIMELINE_DATA.svg_width
      = (period_len + CONFIG.h_margin_in_year * 2) * CONFIG.year_to_px_factor;
    TIMELINE_DATA.svg_height = CONFIG.header_row_height + CONFIG.row_height * 2;
    TIMELINE_DATA.max_row_num = 1;
    TIMELINE_DATA.init_state = false;

    svg_elt.setAttribute('width', TIMELINE_DATA.svg_width);
    svg_elt.setAttribute('height', TIMELINE_DATA.svg_height);
    svg_elt.setAttribute('viewBox', '0 0 ' + TIMELINE_DATA.svg_width + ' ' + TIMELINE_DATA.svg_height);

    const header_g_elt = document.getElementById('header_and_v_bars'),
      h_rule = document.createElementNS(SVG_NS, 'line'),
      h_rule_attr = [['id', 'h_rule'], ['class', 'header'],
        ['x1', 0], ['y1', CONFIG.header_row_height],
        ['x2', TIMELINE_DATA.svg_width], ['y2', CONFIG.header_row_height]];
    h_rule_attr.forEach(k_v => { h_rule.setAttribute(k_v[0], k_v[1]); });
    header_g_elt.appendChild(h_rule);  add_text_node(header_g_elt, '\n');

    add_selector_option(m.which_row, '2', '2行目');
  } else { // 既存の期間が少なくとも一つはある場合
    if (TIMELINE_DATA.max_row_num < which_row) {
      TIMELINE_DATA.max_row_num++;
      TIMELINE_DATA.svg_height += CONFIG.row_height;
      svg_elt.setAttribute('height', TIMELINE_DATA.svg_height);
      svg_elt.setAttribute('viewBox', '0 0 ' + TIMELINE_DATA.svg_width + ' ' + TIMELINE_DATA.svg_height);
      const n = TIMELINE_DATA.max_row_num + 1;
      add_selector_option(m.which_row, n, n + '行目');
    }

    if (start_year < TIMELINE_DATA.min_year) {
      put_min_year_backwards(start_year);
    }

    if (TIMELINE_DATA.max_year < end_year) {
      put_max_year_forward(end_year);
    }
  }

  update_v_bars();

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('id', new_pid + 'g');

  const row_start_y = CONFIG.header_row_height + 
                        (which_row - 1) * CONFIG.row_height;
/*
    color_theme_class_name = 'theme_' + color_theme + '_'
                               + COLOR_THEMES[color_theme].id;
*/
  const rect = document.createElementNS(SVG_NS, 'rect'),
    rect_x = (CONFIG.h_margin_in_year + (start_year - TIMELINE_DATA.min_year))
               * CONFIG.year_to_px_factor,
    rect_y = row_start_y + CONFIG.v_margin_within_row + CONFIG.font_size,
    left_end_open = ((start_year_type === 'dummy') ? true : false),
    right_end_open = ((end_year_type === 'dummy') ? true : false),
    gradient_type = (left_end_open ?
                       (right_end_open ? 'open_open' : 'open_closed') :
                       (right_end_open ? 'closed_open' : 'closed_closed')),
    gradient_def_name = color_theme + '_' + gradient_type,
    rect_attr = [['id', new_pid], ['x', rect_x], ['y', rect_y],
      ['width', rect_w], ['height', CONFIG.bar_height],
      ['fill', 'url(#' + gradient_def_name + ')']];
  rect_attr.forEach(k_v => { rect.setAttribute(k_v[0], k_v[1]); });
  g.appendChild(rect);  add_text_node(g, '\n');

  if (! left_end_open) {
    const start_txt = document.createElementNS(SVG_NS, 'text'),
      start_attr = [['id', new_pid + '_start_year'],
        ['class', 'year ' + color_theme],
        ['x', rect_x],
        ['y', row_start_y + CONFIG.v_margin_within_row],
        ['dx', 0], ['dy', CONFIG.txt_dy]];
    start_attr.forEach(k_v => { start_txt.setAttribute(k_v[0], k_v[1]); });
    add_text_node(start_txt, start_year);
    g.appendChild(start_txt);  add_text_node(g, '\n');
  }
  if (! right_end_open) {
    const end_txt = document.createElementNS(SVG_NS, 'text'),
      end_txt_x = rect_x + rect_w - 
        (end_year.toString().length) * CONFIG.monospace_char_width,
      end_attr = [['id', new_pid + '_end_year'],
        ['class', 'year ' + color_theme],
        ['x', end_txt_x],
        ['y', row_start_y + CONFIG.v_margin_within_row],
        ['dx', 0], ['dy', CONFIG.txt_dy]];
    end_attr.forEach(k_v => { end_txt.setAttribute(k_v[0], k_v[1]); });
    add_text_node(end_txt, end_year);
    g.appendChild(end_txt);  add_text_node(g, '\n');
  }
  const label_txt = document.createElementNS(SVG_NS, 'text'),
    label_attr = [['id', new_pid + '_label'],
      ['class', 'label ' + color_theme],
      ['x', rect_x],
      ['y', row_start_y + CONFIG.v_margin_within_row + 
            CONFIG.font_size + CONFIG.bar_height],
      ['dx', 0], ['dy', CONFIG.txt_dy]];
  label_attr.forEach(k_v => { label_txt.setAttribute(k_v[0], k_v[1]); });
  add_text_node(label_txt, period_label);
  g.appendChild(label_txt);  add_text_node(g, '\n');

  timeline_body_elt.appendChild(g);  add_text_node(timeline_body_elt, '\n');

  const p_dat = new period_data(start_year, end_year, which_row, color_theme);
  TIMELINE_DATA.periods.set(new_pid, p_dat);
}

/*
function heighten_svg() {
}

function widen_svg() {
}
*/

function update_v_bars() {
  const min_y_incl_margin = TIMELINE_DATA.min_year - CONFIG.h_margin_in_year + 1,
    max_y_incl_margin = TIMELINE_DATA.max_year + CONFIG.h_margin_in_year - 1,
    min_y = min_y_incl_margin - 
            min_y_incl_margin % CONFIG.vertical_bar_interval_in_year,
    max_y = max_y_incl_margin - 
            max_y_incl_margin % CONFIG.vertical_bar_interval_in_year,
    header_elt = document.getElementById('header_and_v_bars'),
    y_bottom = CONFIG.header_row_height + 
                   CONFIG.row_height * (TIMELINE_DATA.max_row_num + 1);

  TIMELINE_DATA.v_bars.forEach(y => {
    if (y < min_y || max_y < y) { 
      TIMELINE_DATA.v_bars.delete(y);
      const v = document.getElementById('v_bar_' + y),
        v_txt = document.getElementById('v_bar_txt_' + y);
      header_elt.removeChild(v);
      header_elt.removeChild(v_txt);
    }
  });

  for (let year = min_y; year <= max_y; 
           year += CONFIG.vertical_bar_interval_in_year) {
    const x = (year - TIMELINE_DATA.min_year + CONFIG.h_margin_in_year) *
                CONFIG.year_to_px_factor,
        txt_span = year.toString().length * CONFIG.monospace_char_width;
    if (TIMELINE_DATA.v_bars.has(year)) { // year 年の縦線が存在する場合。
      const v = document.getElementById('v_bar_' + year),
        v_attr = [['x1', x], ['x2', x], ['y2', y_bottom]];
      v_attr.forEach(k_v => { v.setAttribute(k_v[0], k_v[1]); });
      const v_txt = document.getElementById('v_bar_txt_' + year);
      v_txt.setAttribute('x', x - txt_span/2);
    } else { // year 年の縦線が存在しないので、新たに作成する。
      const v = document.createElementNS(SVG_NS, 'line'),
        v_attr = [['id', 'v_bar_' + year], ['class', 'v_bar'],
          ['x1', x], ['y1', CONFIG.txt_region_in_header_row],
          ['x2', x], ['y2', y_bottom]];
      v_attr.forEach(k_v => { v.setAttribute(k_v[0], k_v[1]); });
      header_elt.appendChild(v);

      const v_txt = document.createElementNS(SVG_NS, 'text'),
        txt_attr = [['id', 'v_bar_txt_' + year], ['class', 'year v_bar'],
          ['x', x - txt_span/2], ['y', 0], ['dx', 0], ['dy', CONFIG.txt_dy]];
      add_text_node(v_txt, year);
      txt_attr.forEach(k_v => { v_txt.setAttribute(k_v[0], k_v[1]); });
      header_elt.appendChild(v_txt);

      TIMELINE_DATA.v_bars.add(year);
    }
  }
}

function put_min_year_backwards(new_start_year) {
  if (TIMELINE_DATA.init_state || TIMELINE_DATA.min_year <= new_start_year) {
    return;
  }

  const diff_year = TIMELINE_DATA.min_year - new_start_year, // 正になる
    diff_x = diff_year * CONFIG.year_to_px_factor;
}

function put_min_year_forward(new_start_year) {
}

function put_max_year_forward(new_end_year) {
  if (TIMELINE_DATA.init_state || new_end_year <= TIMELINE_DATA.max_year) {
    return;
  }

  const diff_year = new_end_year - TIMELINE_DATA.max_year, // 正になる
    diff_x = diff_year * CONFIG.year_to_px_factor;
}

function put_max_year_backwards(new_end_year) {
}

/* 「ダウンロードする」メニュー。 */
function download_svg() {
  const s = document.getElementById('timeline_container').innerHTML;
  const b = new Blob([s], {type :'image/svg+xml'});
  // ダウンロード用リンクを作る。
  const a = document.createElement('a');
  document.getElementsByTagName('body')[0].appendChild(a);
  a.download = 'timeline.svg';
  // Blob 要素へのリンク URL を生成し、それを a タグの href 要素に設定する。
  a.href = URL.createObjectURL(b);
  a.click();
}

/* 「作成済みのデータを読み込む」メニュー。 */
function read_in() {
  const reader = new FileReader();
  reader.onload = function (e) {
    // 読み込んだテキストの内容を、divタグ (IDは 'timeline_container') の中身
    // として書き出す。
    document.getElementById('timeline_container').innerHTML = e.target.result;
    // **** TO DO **** SVGの各要素を読み取って、変数の設定を行う。
    const b = {ja: '作成済みのデータを読み込む', 
               en: 'reading data saved before'};
  }
  // テキストファイルとして読み込む。
  reader.readAsText(document.getElementById('input_svg_file').files[0]);
}
