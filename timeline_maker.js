'use strict';

/* SVG 用の名前空間 */
const SVG_NS = 'http://www.w3.org/2000/svg';
/* ページの言語。日本語がデフォルト。英語 (en) のページも後で作る。 */
let LANG = 'ja';

/* 入力フォーム中の期間・出来事を表すセレクタを要素とする配列。
実際の中身は、window.top.onload で設定する。 */
const PERIOD_SELECTORS = new Set(), EVENT_SELECTORS = new Set(),
  ARROW_SELECTORS = new Set();

/* 各期間について管理するためのオブジェクト */
class period_data {
  constructor(start_year, end_year, row, base_color_theme, color_theme) {
    this.start_year = start_year;  this.end_year = end_year;  this.row = row;
    this.base_color_theme = base_color_theme;  this.color_theme = color_theme;
  }
  print() { console.log(JSON.stringify(this)); }
  is_included(year) {
    if (isNaN(year)) { return(false); }
    return( this.start_year <= year && year <= this.end_year );
  }
}

/* 矢印について管理するためのオブジェクト */
class arrow_data {
  constructor(start_period_id, end_period_id, arrowed_year, x_center, y_start, y_end) {
    this.start_period_id = start_period_id; this.end_period_id = end_period_id;
    this.arrowed_year = arrowed_year; this.x_center = x_center; 
    this.y_start = y_start; this.y_end = y_end;
  }
  print() { console.log(JSON.stringify(this)); }
}

/* デバッグ対象の関数に対応するプロパティを 0 以上の値に設定すること。 */
const MODE = {
  f_add_period: 0,  f_update_v_bars: 0,  f_remove_period: 0
};

/* 年表全体の現状を管理する大域オブジェクト。 */
var TIMELINE_DATA = TIMELINE_DATA || {
  next_period_id: 0,  next_event_id: 0, next_arrow_id: 0,
  max_row_num: 0,  // 1 行目は 1 と数える。0 は何も期間がないことを表す。
  svg_width: 0,  svg_height: 0,
  init_state: true,
  periods: new Map(),  events: new Map(),  v_bars: new Set(),
  arrows: new Map(),
  min_year: 9999,  max_year: -9999,    // 初期値
  reset_all: function () {
    this.next_period_id = 0;  this.next_event_id = 0;  this.max_row_num = 0;
    this.svg_width = 0;  this.svg_height = 0;
    this.init_state = true;
    this.periods = new Map();  this.events = new Map();
    this.v_bars = new Set();  this.arrows = new Map();
    this.min_year = 9999;  this.max_year = -9999;
  },
  print: function() {
    console.log('TIMELINE_DATA is:\n' + JSON.stringify(this) + '\n');
    // 型が Map や Set のプロパティが JSON.stringify でうまく出力されなかった……。
    console.log(  'periods:');
    this.periods.forEach((dat, pid, m) => {
      console.log(`  ${pid}: ${JSON.stringify(dat)} ,\n`);
    });
    console.log(  'events:');
    this.events.forEach((dat, eid, m) => {
      console.log(`  ${eid}: ${JSON.stringify(dat)} ,\n`);
    });
    console.log(  'arrows:');
    this.arrows.forEach((dat, aid, m) => {
      console.log(`  ${aid}: ${JSON.stringify(dat)} ,\n`);
    });
    let s =   'v_bars: ';
    this.v_bars.forEach(year => { s += year + ','; });
    console.log(s);
  }
};

/* 各種定数 */
const CONFIG = {
  // 年の許容範囲
  min_allowable_year: -9999,  max_allowable_year: 9999,
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
  // 期間の端の色をフェードアウトさせる場合に、端から何パーセントのところまで
  // グラデーションにするか (そこから先の中心に近い部分はべた塗り)。
  fading_region_ratio: 15,
  // 期間の配置先たる各行の高さ
  row_height: 64,
  // フォントサイズ (一律)。
  font_size: 16,
  // 年を等幅フォントで表示するが、その文字幅の概算値としてフォントサイズの
  // 半分を使う。
  monospace_char_width: 8,
  // 各行の上下のマージン 
  // (これは (row_height - (font_size * 2 + bar_height))/2 である)
  v_margin_within_row: 6,
  // 出来事を表す円の半径
  circle_radius: 16,
  // 年からピクセルへの変換倍率
  year_to_px_factor: 20,
  //
  arrow_width: 2,
  arrow_head_protrusion: 6
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

  [m.period_to_re_label, m.period_to_re_color, 
   m.period_to_re_define, m.period_to_move, m.period_to_remove, 
   m.period_including_this_event, 
   m.start_point_of_arrow, m.end_point_of_arrow]
   .forEach(sel => { PERIOD_SELECTORS.add(sel); });
  EVENT_SELECTORS.add(m.event_to_remove);
  ARROW_SELECTORS.add(m.arrow_to_remove);

  reset_svg();
  return(true);
}

/* 年から、その年の開始位置に相当する x 座標への変換 */
function year_to_x(year) {
  return((year - TIMELINE_DATA.min_year + CONFIG.h_margin_in_year)
           * CONFIG.year_to_px_factor);
}

/* x 座標から年への変換 (x 座標が年の開始位置に相当するものと見なしている) */
function x_to_year(x) {
  return(x / CONFIG.year_to_px_factor
           + TIMELINE_DATA.min_year - CONFIG.h_margin_in_year);
}
/* 円の cx 属性で指定される x 座標から年への変換。
x_to_year(cx) - 0.5 と同じ。 */
function cx_to_year(cx) { return(Math.floor(x_to_year(cx))); }

/* 行番号から、その行の上端の y 座標への変換 */
function row_num_to_row_start_y(row) {
  return(CONFIG.header_row_height + (row - 1) * CONFIG.row_height);
}
/* 行番号から、その行に配置される rect 要素 (期間を表す) の y 属性の値への
変換 */
function row_num_to_rect_y(row) {
  return(row_num_to_row_start_y(row) + 
         CONFIG.v_margin_within_row + CONFIG.font_size);
}
/* 行番号から、その行に配置される期間の開始年・終了年の text 要素 の y 属性の
値への変換 */
function row_num_to_year_txt_y(row) {
  return(row_num_to_row_start_y(row) + CONFIG.v_margin_within_row);
}
/* 行番号から、その行に配置される期間についての説明ラベルの text 要素 の 
y 属性の値への変換 */
function row_num_to_label_txt_y(row) {
  return(row_num_to_row_start_y(row) + CONFIG.v_margin_within_row + 
         CONFIG.font_size + CONFIG.bar_height);
}
/* 行番号から、その行に配置される期間内の出来事を表す circle 要素の cy 属性の
値への変換 */
function row_num_to_cy(row) {
  return(row_num_to_row_start_y(row) + CONFIG.v_margin_within_row + 
         CONFIG.font_size + CONFIG.bar_height / 2);
}
/* rect 要素の y 属性 (上辺の y 座標) の値から、その rect 要素 (期間を表す) が
配置されている行の番号への変換 */
function rect_y_to_row_num(y) {
  const row_start_y = y - CONFIG.v_margin_within_row - CONFIG.font_size;
  return((row_start_y - CONFIG.header_row_height) / CONFIG.row_height + 1);
}
/* 矢印の始点側の期間がある行の番号と、矢印の終点側の期間がある行の番号と、
両向き矢印かどうかという真偽値とを引数にとり、始点と終点の y 座標のペアを
返す。 */
function row_nums_to_arrow_y_vals(start_row, end_row, is_double_headed) {
  //console.log('row_nums_to_arrow_y_vals(' + start_row + ', ' + end_row + ', ' + is_double_headed + ')\n');
  const half_h = Math.round(CONFIG.bar_height / 2);
  let y_start = row_num_to_rect_y(start_row) + half_h, 
      y_end = row_num_to_rect_y(end_row) + half_h;
  if (is_double_headed) { // 両向き矢印
    if (start_row < end_row) {
      y_start += CONFIG.arrow_head_protrusion;  // 上にある
      y_end -= CONFIG.arrow_head_protrusion;    // 下にある
    } else {
      y_start -= CONFIG.arrow_head_protrusion;  // 下にある
      y_end += CONFIG.arrow_head_protrusion;    // 上にある
    }
  } else if (start_row < end_row) { // 上から下への矢印
    y_end -= CONFIG.arrow_head_protrusion;  // 下にある
  } else { // 下から上への矢印
    y_end += CONFIG.arrow_head_protrusion;  // 上にある
  }
  return({ y_start: y_start, y_end: y_end });
}

/* 年を表示するための text 要素の textLength 属性に設定すべき値を求める。 */
function year_txt_len(year) {
  return(year.toString().length * CONFIG.monospace_char_width);
}
/* 期間の開始側 (左側) と終了側 (右側) について、'actual' または 'dummy' と
指定する入力を得た場合に、その入力と等価で、後の処理の都合に適した形式の
三つの値からなるオブジェクトを返す。 */
function rect_type(start_year_type, end_year_type) {
  const t = {};
  t.left_end_open = (start_year_type === 'dummy') ? true : false;
  t.right_end_open = (end_year_type === 'dummy') ? true : false;
  t.gradient_type = t.left_end_open ?
                      (t.right_end_open ? 'open_open' : 'open_closed') :
                      (t.right_end_open ? 'closed_open' : 'closed_closed');
  return(t);
}

/* svg 要素を初期状態に戻してから、配色テーマを読み取ってその定義を追加する。 */
function reset_svg() {
  resize_svg(0, 0);
  ['theme_style_def', 'gradient_def', 'arrow_def', 
   'header_and_v_bars', 'timeline_body', 'arrow_container']
    .forEach(id => { document.getElementById(id).innerHTML = ''; });
  set_theme_defs();
  set_arrow_color_defs();
}

/* svg 要素の大きさを変更する。 */
function resize_svg(w, h) {
  const svg_elt = document.getElementById('timeline'),
    attr = [['width', w], ['height', h], ['viewBox', `0 0 ${w} ${h}`]];
  attr.forEach(k_v => { svg_elt.setAttribute(k_v[0], k_v[1]); });
}

/* themes.js に定義されている配色テーマの定義を読み取り、svg 要素内にその定義を
反映させ、配色テーマ用のセレクタに選択肢を追加する。 */
function set_theme_defs() {
  if (! check_theme_ids(COLOR_THEMES)) {
    alert('Error in themes.js.\nPlease correct themes.js.');  return(false);
  }

  const style_elt = document.getElementById('theme_style_def');
  // なお、本来は、style_elt.sheet という CSSStyleSheet オブジェクトを用いて、
  // このオブジェクトに対して insertRule メソッドを使って CSS 規則を追加したいが、
  // Safari だとこの CSSStyleSheet オブジェクトが取得できない。
  // そこで、<style> 要素の innerHTML に対する文字列操作により CSS 規則を追加する
  // ことにした。

  const defs_elt = document.getElementById('gradient_def');

  // 期間を表す矩形の本体の比較的不透明な部分用の色指定用の属性群と、左右両端を
  // フェードアウトさせる場合の最も透明度の高い端の部分用の色指定用の属性群の
  // ための変数。関数 add_grad を呼ぶ前に設定する。なお属性群と書いたが、実際は
  // stop-opacity と stop-color の二つだけ。
  let opaque_attr, fading_attr;

  // フェードアウトしない場合は、opaque_attr に設定された属性を端まで使う。
  // フェードアウトさせる場合は、端に stop 要素を定義して、そこに fading_attr の
  // 属性を設定するとともに、端から 15% のところにも stop 要素を定義して、そこに
  // opaque_attr の属性を設定する。
  // なおこの「15%」という値は、CONFIG.fading_region_ratio で設定している。
  // 以上の方針による linearGradient 要素を作成・追加する。
  const stop_L_offset_str = CONFIG.fading_region_ratio + '%',  // '15%' となる
    stop_R_offset_str = 
      parseInt(100 - CONFIG.fading_region_ratio).toString() +'%';  // '85%'
  function add_grad(left_open, right_open, id) {
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    let grad_id = id;
    grad_id += (left_open ? '_open' : '_closed');
    grad_id += (right_open ? '_open' : '_closed');
    grad.setAttribute('id', grad_id);
    add_text_node(grad, '\n');
    // 左側
    // 左端 (左端から 0% の場所) の stop 要素
    const stop_0 = document.createElementNS(SVG_NS, 'stop');
    stop_0.setAttribute('offset', '0%');
    if (left_open) {
      fading_attr.forEach((k_v) => { stop_0.setAttribute(k_v[0], k_v[1]); });
      grad.appendChild(stop_0);  add_text_node(grad, '\n');
      // 左端からのグラデーションの部分と、それより中心側のべた塗りの部分との
      // 境界に当たる stop 要素
      const stop_L = document.createElementNS(SVG_NS, 'stop');
      stop_L.setAttribute('offset', stop_L_offset_str);
      opaque_attr.forEach((k_v) => { stop_L.setAttribute(k_v[0], k_v[1]); });
      grad.appendChild(stop_L);  add_text_node(grad, '\n');
    } else {
      opaque_attr.forEach((k_v) => { stop_0.setAttribute(k_v[0], k_v[1]); });
      grad.appendChild(stop_0);  add_text_node(grad, '\n');
    }
    // 右側
    // 右端 (左端から 100% の場所) の stop 要素
    const stop_100 = document.createElementNS(SVG_NS, 'stop');
    stop_100.setAttribute('offset', '100%');
    if (right_open) {
      // 右端からのグラデーションの部分と、それより中心側のべた塗りの部分との
      // 境界に当たる stop 要素
      const stop_R = document.createElementNS(SVG_NS, 'stop');
      stop_R.setAttribute('offset', stop_R_offset_str);
      opaque_attr.forEach((k_v) => { stop_R.setAttribute(k_v[0], k_v[1]); });
      grad.appendChild(stop_R);  add_text_node(grad, '\n');
      fading_attr.forEach((k_v) => { stop_100.setAttribute(k_v[0], k_v[1]); });
      grad.appendChild(stop_100);  add_text_node(grad, '\n');
    } else {
      opaque_attr.forEach((k_v) => { stop_100.setAttribute(k_v[0], k_v[1]); });
      grad.appendChild(stop_100);  add_text_node(grad, '\n');
    }
    // 
    add_text_node(defs_elt, '\n');
    defs_elt.appendChild(grad);
    add_text_node(defs_elt, '\n');
  }

  COLOR_THEMES.forEach(th => {
    // 出来事を表す円のための CSS 規則を追加
    const circle_rule = 'circle.' + th.id + 
       ' { fill: ' + th.circle_fill + '; stroke: ' + th.circle_stroke + '; }\n',
      text_rule = 'text.' + th.id + ' { fill: ' + th.text_fill + '; }\n';
    style_elt.innerHTML += ('\n' + circle_rule + text_rule);
    // 期間を表す矩形のための 4 種類の linearGradient 要素を追加
    opaque_attr = [['stop-opacity', th.bar_body_opacity], 
                   ['stop-color', th.bar_color]];
    fading_attr = [['stop-opacity', th.bar_fading_end_opacity], 
                   ['stop-color', th.bar_color]];
    add_grad(true, true, th.id);
    add_grad(true, false, th.id);
    add_grad(false, true, th.id);
    add_grad(false, false, th.id);
    // 「期間を追加」メニューの「配色」セレクタに選択肢を追加
    add_selector_option(document.menu.color_theme, th.id, th.name[LANG]);
    // 「期間の配色を変更」メニューの「配色」セレクタに選択肢を追加
    add_selector_option(document.menu.new_color_theme, th.id, th.name[LANG]);
  });
}

/* 配色テーマまたは矢印の色の定義に使われる ID についての簡易チェック。 */
function check_theme_ids(target_def_arr) {
  // ID に重複がないことを確認
  const ids = target_def_arr.map(th => { return(th.id); }).sort(), 
    L = ids.length;
  for (let i = 0; i < L-1; i++) { if (ids[i] === ids[i+1]) { return(false); } }
  // ID の形式を確認
  const re = /^[a-zA-Z_]\w*$/;
  for (let i = 0; i < L; i++) { if (! re.test(ids[i]))  { return(false); } }
  // ここに来るのは問題がない場合のみ
  return(true);
}

/* themes.js に定義されている矢印の色の定義を読み取り、svg 要素内にその定義を
反映させる。また、矢印の色のセレクタに選択肢を追加する。 */
function set_arrow_color_defs() {
  if (! check_theme_ids(ARROW_COLORS)) {
    alert('Error in themes.js.\nPlease correct themes.js.');  return(false);
  }

  remove_all_children(document.menu.arrow_color);

  const defs_elt = document.getElementById('arrow_def');
  ARROW_COLORS.forEach(ac => {
    // 既存なら何もしない
    if (document.getElementById(ac.id + '_arrow_head')) { return; }

    const marker = document.createElementNS(SVG_NS, 'marker');
    [['id', ac.id + '_arrow_head'],  ['markerUnits', 'strokeWidth'],
     ['markerWidth', 4], ['markerHeight', 4],
     ['viewBox', '0 0 8 8'], ['refX', 4], ['refY', 4],
     ['orient', 'auto-start-reverse']].forEach((k_v) => {
      marker.setAttribute(k_v[0], k_v[1]);
    });
    add_text_node(defs_elt, '\n');
    defs_elt.appendChild(marker);
    add_text_node(defs_elt, '\n');
    const polygon = document.createElementNS(SVG_NS, 'polygon');

    add_text_node(marker, '\n  ');
    polygon.setAttribute('points', '0,0 8,4 0,8 2,4');
    polygon.setAttribute('fill', ac.arrow_color);
    marker.appendChild(polygon);
    add_text_node(marker, '\n');

    add_selector_option(document.menu.arrow_color, ac.id, ac.name[LANG]);
  });
}

/* SVG 要素 (rect, line, circle) を移動させる。 */
function move_svg_elt(id, dx, dy, is_circle = false) {
  const elt = document.getElementById(id);
  if (elt === null) { return; }
  const x_name = (is_circle ? 'cx' : 'x'), y_name = (is_circle ? 'cy' : 'y');
  if (! elt.hasAttribute(x_name) || ! elt.hasAttribute(y_name)) { return; }
  const x = parseInt(elt.getAttribute(x_name)), 
        y = parseInt(elt.getAttribute(y_name));
  elt.setAttribute(x_name, x + dx);  elt.setAttribute(y_name, y + dy);
}

/* 年表全体で最も早い年・最も遅い年が変化する可能性がある場合 (期間の追加、
期間の範囲の変更、既存ファイルの読み込み、配色見本の表示のいずれかを行った
場合) に呼ばれる。スライダの左右に表示される年の文字列を書き換え、スライダの 
min 属性と max 属性の値も書き換える。 */
function set_year_range() {
  const y = document.menu.year_slider, 
    min_year = document.getElementById('min_year'),
    max_year = document.getElementById('max_year');
  y.min = min_year.textContent = TIMELINE_DATA.min_year;
  y.max = max_year.textContent = TIMELINE_DATA.max_year;
  y.value = Math.floor((TIMELINE_DATA.min_year + TIMELINE_DATA.max_year)/2);
}

/* スライダの値を変更すると呼ばれる。 */
function view() {
  // スライダで指定された年を中心に表示する。
  const svg_container = document.getElementById('timeline_container'),
    container_rect = svg_container.getBoundingClientRect(),
    x_offset = Math.floor(container_rect.width / 2),
    year_to_view = parseInt(document.menu.year_slider.value);
  svg_container.scrollLeft = year_to_x(year_to_view) - x_offset;

  // スライダで指定している年の前後 span_half (= 10) 年の出来事を、年の順に
  // リスト表示する。
  const event_list = [], span_half = 10, // 10 は適当に決めた定数
    min_y = year_to_view - span_half, max_y = year_to_view + span_half;
  TIMELINE_DATA.events.forEach((y, eid, m) => {
    if (min_y <= y && y <= max_y) { event_list.push( {id: eid, year: y} ); }
  });
  event_list.sort((a, b) => {
    if (a.year < b.year) { return(-1); }
    if (a.year > b.year) { return(1); }
    return(0);
  });
  // 非効率だが、ひとまずは、この関数が呼ばれるたびにリストを白紙化・再作成
  // することにする。
  const ul = document.getElementById('description_items');
  ul.innerHTML = '';
  event_list.forEach(ev => {
    const label_txt = document.getElementById(ev.id + '_label').textContent,
      li = document.createElement('li');
    li.innerHTML = label_txt;
    ul.appendChild(li);
  });
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

  if (! check_year_range(start_year, end_year)) { return; }
  if (period_label === '') {
    const msg = {ja: 'ラベルを入力してください', en: 'Enter a label.'};
    alert(msg[LANG]);  return;
  }
  add_period_0(new_pid, start_year, start_year_type, end_year, end_year_type, 
    period_label, which_row, color_theme);
}

/* 開始年と終了年の入力を parseInt した結果を引数にとり、その入力がまともか
どうかをチェックして、まともなら true を返し、駄目なら false を返す。 */
function check_year_range(start_year, end_year) {
  if (isNaN(start_year)) {
    const msg = {ja: '開始年は整数を入力してください', 
                 en: 'Enter an integer for the start year.'};
    alert(msg[LANG]);  return(false);
  }
  if (isNaN(end_year)) {
    const msg = {ja: '終了年は整数を入力してください', 
                 en: 'Enter an integer for the end year.'};
    alert(msg[LANG]);  return(false);
  }
  if (end_year <= start_year) {
    const msg = {
      ja: '開始年以前の終了年を指定しないでください',
      en: 'Do not enter the end year that is earlier than or equal to the start year.'
    };
    alert(msg[LANG]);  return(false);
  }
  return(true);
}

/* 「期間を追加」メニューの実質部分。配色見本の表示などで、フォームからの入力
なしに期間を描画したい場合があるので、別の関数に分けた。 */
function add_period_0(new_pid, start_year, start_year_type, end_year, end_year_type, period_label, which_row, color_theme) {
  const m = document.menu, svg_elt = document.getElementById('timeline'),
    timeline_body_elt = document.getElementById('timeline_body'),
    period_len = end_year - start_year + 1,
    rect_w = period_len * CONFIG.year_to_px_factor;

  if (TIMELINE_DATA.init_state) { // これが最初の期間の追加である場合
    TIMELINE_DATA.min_year = start_year;
    TIMELINE_DATA.max_year = end_year;
    TIMELINE_DATA.svg_width
      = (period_len + CONFIG.h_margin_in_year * 2) * CONFIG.year_to_px_factor;
    TIMELINE_DATA.svg_height = CONFIG.header_row_height + CONFIG.row_height * 2;
    TIMELINE_DATA.max_row_num = 1;
    TIMELINE_DATA.init_state = false;
    resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);

    const header_g_elt = document.getElementById('header_and_v_bars'),
      h_rule = document.createElementNS(SVG_NS, 'line'),
      h_rule_attr = [['id', 'h_rule'], ['class', 'header'],
        ['x1', 0], ['y1', CONFIG.header_row_height],
        ['x2', TIMELINE_DATA.svg_width], ['y2', CONFIG.header_row_height]];
    h_rule_attr.forEach(k_v => { h_rule.setAttribute(k_v[0], k_v[1]); });
    add_text_node(header_g_elt, '\n');
    header_g_elt.appendChild(h_rule);  add_text_node(header_g_elt, '\n');

    add_selector_option(m.which_row, '2', '2行目');
  } else { // 既存の期間が少なくとも一つはある場合
    if (TIMELINE_DATA.max_row_num < which_row) {
      if (TIMELINE_DATA.max_row_num + 1 !== which_row) {
        alert('Unexpected error: TIMELINE_DATA.max_row_num + 1 !== which_row');
        return;
      }
      TIMELINE_DATA.max_row_num++;
      TIMELINE_DATA.svg_height += CONFIG.row_height;
      resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);
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
  svg_elt.dataset.min_year = TIMELINE_DATA.min_year;
  svg_elt.dataset.max_year = TIMELINE_DATA.max_year;
  svg_elt.dataset.max_row_num = TIMELINE_DATA.max_row_num;
  set_year_range();

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('id', new_pid + 'g');

  const rect = document.createElementNS(SVG_NS, 'rect'),
    rect_x = year_to_x(start_year),
    rect_y = row_num_to_rect_y(which_row),
    typ = rect_type(start_year_type, end_year_type),
    gradient_def_name = color_theme + '_' + typ.gradient_type,
    rect_attr = [['id', new_pid], ['x', rect_x], ['y', rect_y],
      ['width', rect_w], ['height', CONFIG.bar_height],
      ['fill', 'url(#' + gradient_def_name + ')']];
  rect_attr.forEach(k_v => { rect.setAttribute(k_v[0], k_v[1]); });
  add_text_node(g, '\n');  g.appendChild(rect);  add_text_node(g, '\n');

  if (! typ.left_end_open) {
    const start_txt = document.createElementNS(SVG_NS, 'text'),
      start_txt_len = year_txt_len(start_year),
      start_attr = [['id', new_pid + '_start_year'],
        ['class', 'year ' + color_theme],
        ['x', rect_x], ['y', row_num_to_year_txt_y(which_row)],
        ['dx', 0], ['dy', CONFIG.font_size], ['textLength', start_txt_len]];
    start_attr.forEach(k_v => { start_txt.setAttribute(k_v[0], k_v[1]); });
    add_text_node(start_txt, start_year);
    g.appendChild(start_txt);  add_text_node(g, '\n');
  }
  if (! typ.right_end_open) {
    const end_txt = document.createElementNS(SVG_NS, 'text'),
      end_txt_len = year_txt_len(end_year),
      end_txt_x = rect_x + rect_w - end_txt_len,
      end_attr = [['id', new_pid + '_end_year'],
        ['class', 'year ' + color_theme],
        ['x', end_txt_x], ['y', row_num_to_year_txt_y(which_row)],
        ['dx', 0], ['dy', CONFIG.font_size], ['textLength', end_txt_len]];
    end_attr.forEach(k_v => { end_txt.setAttribute(k_v[0], k_v[1]); });
    add_text_node(end_txt, end_year);
    g.appendChild(end_txt);  add_text_node(g, '\n');
  }
  const label_txt = document.createElementNS(SVG_NS, 'text'),
    label_attr = [['id', new_pid + '_label'],
      ['class', 'label ' + color_theme],
      ['x', rect_x], ['y', row_num_to_label_txt_y(which_row)],
      ['dx', 0], ['dy', CONFIG.font_size]];
  label_attr.forEach(k_v => { label_txt.setAttribute(k_v[0], k_v[1]); });
  add_text_node(label_txt, period_label);
  g.appendChild(label_txt);  add_text_node(g, '\n');

  timeline_body_elt.appendChild(g);  add_text_node(timeline_body_elt, '\n');

  const p_dat = new period_data(start_year, end_year, which_row, color_theme, gradient_def_name);
  TIMELINE_DATA.periods.set(new_pid, p_dat);
  if (MODE.f_add_period > 0) {
    console.log('add_period():');  TIMELINE_DATA.print();
  }
  PERIOD_SELECTORS.forEach(sel => {
    add_selector_option(sel, new_pid, period_label);
    // `[${start_year}, ${end_year}] ${period_label}` を表示してもよい
    // かもしれないが……
  });
}

/* 目盛用の縦線と、それに対応する年のテキスト要素と、最上段の横罫線とを更新する。
年表全体で最も早い年や最も遅い年が変化した場合や、年表全体の高さが変化した場合に
呼ばれる (これらの場合の中には、初めて期間を追加した場合も含まれる)。 */
function update_v_bars() {
  // たとえば年表全体で最も早い年が 123 年のとき、x 座標が 0 となるのは、
  // 123 - 5 = 118 年 (5 は CONFIG.h_margin_in_year) に相当する。
  // しかし、仮にこれが 25 (CONFIG.vertical_bar_interval_in_year) で割り切れた
  // としても、x 座標が 0 の、ギリギリのところに目盛を描画したくはない。
  // そこで、それよりも 1 年だけ内側 (年表の中心側) のところを、
  // 「目盛を描画する対象になりうる最小の年」として求める。
  // これが min_y_incl_margin であり、年が最も遅い側について同趣旨で求めるのが
  // max_y_incl_margin である。
  const min_y_incl_margin = TIMELINE_DATA.min_year - CONFIG.h_margin_in_year + 1,
    max_y_incl_margin = TIMELINE_DATA.max_year + CONFIG.h_margin_in_year - 1;
  // 上記の二つの値は CONFIG.vertical_bar_interval_in_year で割り切れるとは
  // 限らない。そこで、上記の二つの値で挟まれた閉区間において、
  // CONFIG.vertical_bar_interval_in_year で割り切れる最小値と最大値を求める。
  const min_y_rem = min_y_incl_margin % CONFIG.vertical_bar_interval_in_year,
    min_y = (min_y_rem === 0) ? min_y_incl_margin :
            min_y_incl_margin - min_y_rem + CONFIG.vertical_bar_interval_in_year,
    max_y = max_y_incl_margin - 
            max_y_incl_margin % CONFIG.vertical_bar_interval_in_year;
  // update_v_bars で描画対象となる要素を包含する親要素
  const header_elt = document.getElementById('header_and_v_bars');
  // 目盛線の下端
  const y_bottom = CONFIG.header_row_height + 
                   CONFIG.row_height * (TIMELINE_DATA.max_row_num + 1);

  if (MODE.f_update_v_bars > 0) {
    console.log('\nmin_y_incl_margin=' + min_y_incl_margin);
    console.log('max_y_incl_margin=' + max_y_incl_margin);
    console.log('min_y=' + min_y);
    console.log('max_y=' + max_y);
    console.log('y_bottom=' + y_bottom);
  }

  // 幅の変更にともなって不要となった目盛線と、それに対応する年のテキスト
  // 要素を、すべて削除する。
  TIMELINE_DATA.v_bars.forEach(y => {
    if (y < min_y || max_y < y) { 
      TIMELINE_DATA.v_bars.delete(y);
      header_elt.removeChild(document.getElementById('v_bar_' + y));
      header_elt.removeChild(document.getElementById('v_bar_txt_' + y));
      if (MODE.f_update_v_bars > 0) {
        console.log('Elements for year ' + y + ' have been removed.');
      }
    }
  });

  // min_y 年から max_y 年までの目盛を描画する。
  for (let year = min_y; year <= max_y; 
           year += CONFIG.vertical_bar_interval_in_year) {
    // year 年の目盛に対応する x 座標と、この目盛用のテキスト要素の幅。
    const x = year_to_x(year), txt_span = year_txt_len(year.toString());
    if (TIMELINE_DATA.v_bars.has(year)) { // year 年の縦線が存在する場合。
      if (MODE.f_update_v_bars > 0) {
        console.log('Elements for year ' + year + ' exist.');
      }
      const v = document.getElementById('v_bar_' + year),
        v_attr = [['x1', x], ['x2', x], ['y2', y_bottom]]; // y1 は変化しない。
      v_attr.forEach(k_v => { v.setAttribute(k_v[0], k_v[1]); });
      const v_txt = document.getElementById('v_bar_txt_' + year);
      v_txt.setAttribute('x', x - txt_span/2); // x 以外は変化しない。
    } else { // year 年の縦線が存在しないので、新たに作成する。
      if (MODE.f_update_v_bars > 0) {
        console.log('New elements for year ' + year + ' are created.');
      }
      const v = document.createElementNS(SVG_NS, 'line'),
        v_attr = [['id', 'v_bar_' + year], ['class', 'v_bar'],
          ['x1', x], ['y1', CONFIG.txt_region_in_header_row],
          ['x2', x], ['y2', y_bottom]];
      v_attr.forEach(k_v => { v.setAttribute(k_v[0], k_v[1]); });
      header_elt.appendChild(v);  add_text_node(header_elt, '\n');

      const v_txt = document.createElementNS(SVG_NS, 'text'),
        txt_attr = [['id', 'v_bar_txt_' + year], ['class', 'year v_bar'],
          ['textLength', txt_span],
          ['x', x - txt_span/2], ['y', 0], ['dx', 0], ['dy', CONFIG.font_size]];
      add_text_node(v_txt, year);
      txt_attr.forEach(k_v => { v_txt.setAttribute(k_v[0], k_v[1]); });
      header_elt.appendChild(v_txt);  add_text_node(header_elt, '\n');

      TIMELINE_DATA.v_bars.add(year);
    }
  }

  // 横罫線の右端の座標を再設定する (それ以外は常に変化なし)。
  document.getElementById('h_rule').setAttribute('x2', TIMELINE_DATA.svg_width);
}

/* 目盛用の縦線と、それに対応する年のテキスト要素と、最上段の横罫線とを、すべて
削除する。 */
function init_v_bars() {
  remove_all_children(document.getElementById('header_and_v_bars'));
}

/* 種々の期間の開始年のうちで最も早い年 (TIMELINE_DATA.min_year) を 
new_start_year 年まで遡らせる。それに応じて、年表全体の幅を広げ、既存の要素 
(矩形、テキスト等) を右へずらす。
 */
function put_min_year_backwards(new_start_year) {
  if (TIMELINE_DATA.init_state || TIMELINE_DATA.min_year <= new_start_year) {
    return;
  }
  change_min_year(new_start_year);
}

/* 種々の期間の開始年のうちで最も早い年 (TIMELINE_DATA.min_year) を 
new_start_year 年まで遅らせる。それに応じて、年表全体の幅を狭め、既存の要素 
(矩形、テキスト等) を左へずらす。 */
function put_min_year_forward(new_start_year) {
  if (TIMELINE_DATA.init_state || new_start_year <= TIMELINE_DATA.min_year) {
    return;
  }
  change_min_year(new_start_year);
}

/* put_min_year_backwards と put_min_year_forward の共通部分。 */
function change_min_year(new_start_year) {
  const diff_year = TIMELINE_DATA.min_year - new_start_year,
    diff_x = diff_year * CONFIG.year_to_px_factor;
  TIMELINE_DATA.svg_width += diff_x;
  resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);
  TIMELINE_DATA.min_year = new_start_year;
  TIMELINE_DATA.periods.forEach((p_data, pid, m) => {
    move_period_and_associated_events(pid, diff_x, 0);
  });
}

/* 種々の期間の開始年のうちで最も遅い年 (TIMELINE_DATA.max_year) を
new_end_year 年まで遅らせる。それに応じて、年表全体の幅を広げる。既存の要素 
(矩形、テキスト等) の位置は変化しない。 */
function put_max_year_forward(new_end_year) {
  if (TIMELINE_DATA.init_state || new_end_year <= TIMELINE_DATA.max_year) {
    return;
  }
  change_max_year(new_end_year);
}

/* 種々の期間の開始年のうちで最も遅い年 (TIMELINE_DATA.max_year) を
new_end_year 年まで遡らせる。それに応じて、年表全体の幅を狭める。既存の要素 
(矩形、テキスト等) の位置は変化しない。 */
function put_max_year_backwards(new_end_year) {
  if (TIMELINE_DATA.init_state || TIMELINE_DATA.max_year <= new_end_year) {
    return;
  }
  change_max_year(new_end_year);
}

/* put_max_year_forward と put_max_year_backwards の共通部分。 */
function change_max_year(new_end_year) {
  const diff_year = new_end_year - TIMELINE_DATA.max_year;
  TIMELINE_DATA.svg_width += diff_year * CONFIG.year_to_px_factor;
  resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);
  TIMELINE_DATA.max_year = new_end_year;
}

/* 「期間のラベルを変更」メニュー。 */
function modify_period_label() {
  const pid = selected_choice(document.menu.period_to_re_label),
    new_period_label = document.menu.new_period_label.value;

  if (new_period_label === '') {
    const msg = {ja: '新たなラベルを入力してください', 
                 en: 'Enter a new label.'};
    alert(msg[LANG]);  return;
  }
  document.menu.new_period_label.value = '';

  const label_txt_elt = document.getElementById(pid + '_label');
  remove_all_children(label_txt_elt);
  add_text_node(label_txt_elt, new_period_label);

  PERIOD_SELECTORS.forEach(sel => {
    rename_choice(sel, pid, new_period_label);
  });
}

/* 「期間の配色を変更」メニュー。 */
function re_color() {
  const pid = selected_choice(document.menu.period_to_re_color),
    new_color_theme = selected_choice(document.menu.new_color_theme),
    p_dat = TIMELINE_DATA.periods.get(pid),
    re = new RegExp(p_dat.base_color_theme + 
                    '_\(closed\|open\)_\(closed\|open\)'),
    grad_m = p_dat.color_theme.match(re);
  if (grad_m === null || grad_m.length !== 3) {
    alert('Unexpected error in re_color()');  return;
  }
  const grad_str = '_' + grad_m[1] + '_' + grad_m[2];

  // 期間を表す矩形。
  const rect = document.getElementById(pid);
  rect.setAttribute('fill', 'url(#' + new_color_theme + grad_str + ')');
  // 期間に対するラベル。
  const label_txt = document.getElementById(pid + '_label');
  label_txt.setAttribute('class', 'label ' + new_color_theme);
  // 開始年と終了年のテキスト (もしあれば)。
  // grad_str と、start_year_txt の存否と、end_year_txt の存否との間の
  // 整合性のチェックは、今はしていない (本当はした方がよい)。
  const start_year_txt = document.getElementById(pid + '_start_year');
  if (start_year_txt !== null) {
    start_year_txt.setAttribute('class', 'year ' + new_color_theme);
  }
  const end_year_txt = document.getElementById(pid + '_end_year');
  if (end_year_txt !== null) {
    end_year_txt.setAttribute('class', 'year ' + new_color_theme);
  }
  // この期間に関連づけられた出来事を表す円があれば、その配色も変更する。
  for (let cur_elt = document.getElementById(pid + 'g').firstChild;
       cur_elt !== null; cur_elt = cur_elt.nextSibling) {
    if (cur_elt.nodeName === 'g') { // 出来事
      for (let cur_ev_elt = cur_elt.firstChild;
           cur_ev_elt !== null; cur_ev_elt = cur_ev_elt.nextSibling) {
        if (cur_ev_elt.nodeName == 'circle') {
          cur_ev_elt.setAttribute('class', new_color_theme);
        }
      }
    }
  }
  // 管理用データも更新する。
  p_dat.base_color_theme = new_color_theme;
  p_dat.color_theme = new_color_theme + grad_str;
}

/* 「期間の範囲を変更」メニューで期間を選択すると呼ばれる。期間のセレクタ以外の
入力欄に現在の値をデフォルト値として設定する。 */
function set_present_values() {
  const m = document.menu, pid = selected_choice(m.period_to_re_define),
    p_dat = TIMELINE_DATA.periods.get(pid);

  m.new_start_year.value = p_dat.start_year;
  const re_start_open = /_open_(closed|open)$/,
    s_dummy = document.getElementById('new_start_year_type_dummy'),
    s_actual = document.getElementById('new_start_year_type_actual');
  if (re_start_open.test(p_dat.color_theme)) {
    s_dummy.checked = true;  s_actual.checked = false;
  } else {
    s_actual.checked = true;  s_dummy.checked = false;
  }

  m.new_end_year.value = p_dat.end_year;
  const re_end_open = /_(closed|open)_open$/,
    e_dummy = document.getElementById('new_end_year_type_dummy'),
    e_actual = document.getElementById('new_end_year_type_actual');
  if (re_end_open.test(p_dat.color_theme)) {
    e_dummy.checked = true;  e_actual.checked = false;
  } else {
    e_actual.checked = true;  e_dummy.checked = false;
  }
}

/* 「期間の範囲を変更」メニュー。 */
function re_define_period() {
  const m = document.menu, svg_elt = document.getElementById('timeline'),
    pid = selected_choice(m.period_to_re_define),
    new_start_year = parseInt(m.new_start_year.value),
    new_start_year_type = selected_radio_choice(m.new_start_year_type),
    new_end_year = parseInt(m.new_end_year.value),
    new_end_year_type = selected_radio_choice(m.new_end_year_type);

  if (! check_year_range(new_start_year, new_end_year)) { return; }

  if (new_start_year < TIMELINE_DATA.min_year) {
    put_min_year_backwards(new_start_year);
  }
  if (TIMELINE_DATA.max_year < new_end_year) {
    put_max_year_forward(new_end_year);
  }
  update_v_bars();
  svg_elt.dataset.min_year = TIMELINE_DATA.min_year;
  svg_elt.dataset.max_year = TIMELINE_DATA.max_year;
  set_year_range();

  const p_dat = TIMELINE_DATA.periods.get(pid),
    rect = document.getElementById(pid),
    g = document.getElementById(pid + 'g'),
    new_x = year_to_x(new_start_year),
    new_w = (new_end_year - new_start_year + 1) * CONFIG.year_to_px_factor,
    typ = rect_type(new_start_year_type, new_end_year_type),
    gradient_def_name = p_dat.base_color_theme + '_' + typ.gradient_type;

  // 矩形、ラベルのテキスト、管理用データを更新する。
  [['x', new_x], ['width', new_w], ['fill', 'url(#' + gradient_def_name + ')']]
    .forEach(k_v => { rect.setAttribute(k_v[0], k_v[1]); });
  document.getElementById(pid + '_label').setAttribute('x', new_x);
  p_dat.start_year = new_start_year;
  p_dat.end_year = new_end_year;
  p_dat.color_theme = gradient_def_name;

  // 開始年のテキスト
  let start_txt = document.getElementById(pid + '_start_year');
  if (typ.left_end_open) {
    // 開始側はグラデーションにし、開始年のテキストは付けない。
    // 既存のテキスト要素があれば削除する。
    if (start_txt !== null) { g.removeChild(start_txt); }
  } else { // 開始年のテキストを付ける。
    if (start_txt === null) { // 既存のテキスト要素がなければ作る。
      start_txt = document.createElementNS(SVG_NS, 'text');
      [['id', pid + '_start_year'], ['class', 'year ' + p_dat.base_color_theme],
       ['y', row_num_to_year_txt_y(p_dat.row)],
       ['dx', 0], ['dy', CONFIG.font_size]]
        .forEach(k_v => { start_txt.setAttribute(k_v[0], k_v[1]); });
      g.appendChild(start_txt);  add_text_node(g, '\n');
    } else { // 既存のテキストが存在している。
      remove_all_children(start_txt); // 現在の文字列を削除
    }
    // 以下の 3 行は、既存のテキストの有無によらない共通の処理。
    start_txt.setAttribute('x', new_x);
    start_txt.setAttribute('textLength', year_txt_len(new_start_year));
    add_text_node(start_txt, new_start_year);
  }

  // 終了年のテキストに関しても、類似の処理を行う。
  let end_txt = document.getElementById(pid + '_end_year');
  if (typ.right_end_open) {
    if (end_txt !== null) { g.removeChild(end_txt); }
  } else {
    if (end_txt === null) {
      end_txt = document.createElementNS(SVG_NS, 'text');
      [['id', pid + '_end_year'], ['class', 'year ' + p_dat.base_color_theme],
       ['y', row_num_to_year_txt_y(p_dat.row)],
       ['dx', 0], ['dy', CONFIG.font_size]]
        .forEach(k_v => { end_txt.setAttribute(k_v[0], k_v[1]); });
      g.appendChild(end_txt);  add_text_node(g, '\n');
    } else {
      remove_all_children(end_txt);
    }
    const end_txt_len = year_txt_len(new_end_year);
    end_txt.setAttribute('x', new_x + new_w - end_txt_len);
    end_txt.setAttribute('textLength', end_txt_len);
    add_text_node(end_txt, new_end_year);
  }
}

/* 「期間の配置を変更」メニュー。 */
function move_period() {
  const pid = selected_choice(document.menu.period_to_move),
    up_or_down = selected_radio_choice(document.menu.which_direction),
    g = document.getElementById(pid + 'g'),
    p_dat = TIMELINE_DATA.periods.get(pid);

  if (p_dat.row === 1 && up_or_down === 'upwards') {
    const msg = {ja: '一番上にあるので上には動かせません',
                 en: 'Cannot move the uppermost period upwards.'};
    alert(msg[LANG]);  return;
  }

  // 一番下の行にある期間を下へ移動することは許可する。
  if (p_dat.row === TIMELINE_DATA.max_row_num && up_or_down === 'downwards') {
    // この場合、年表全体の下への拡大を伴う。
    TIMELINE_DATA.max_row_num++;
    TIMELINE_DATA.svg_height += CONFIG.row_height;
    resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);
    update_v_bars();
    // 配置先の行の選択肢も増やす。
    const n = TIMELINE_DATA.max_row_num + 1;
    add_selector_option(document.menu.which_row, n, n + '行目');
  }

  // 一番上の行にある期間を下へ移動する場合、その移動によって一番上の行が
  // 空になる可能性がある。
  if (p_dat.row === 1 && up_or_down === 'downwards' &&
      count_periods_in_first_row() === 1) {
    // 空行のまま放置するか、remove_period でのように全体を上にずらすか、
    // 両者を選択可能とするべきか、考えどころかもしれない。が、とりあえずは、
    // 一貫性を重視して全体を上にずらすことにする。
    TIMELINE_DATA.periods.forEach((cur_p_dat, cur_pid, m) => {
      move_period_and_associated_events_up_or_down(cur_pid, true);
    });
    // ずらした結果、今度は一番下の行が余るから、それを消す。
    remove_last_empty_row();
  }

  // 一番下の行にある期間を上へ移動する場合、その移動によって一番下の行が
  // 空になる可能性がある。その場合、最後の空行を削除する。
  if (p_dat.row === TIMELINE_DATA.max_row_num && up_or_down === 'upwards' &&
      count_periods_in_last_row() === 1) {
    remove_last_empty_row();
  }

  // 移動対象として指定された期間 (と、その中の出来事) を、上または下に動かす。
  move_period_and_associated_events_up_or_down(pid, (up_or_down === 'upwards'));
}

/* 最終行を削除して、年表全体の高さを減らす。配置先の行の選択肢の削除も行う。
他の関数から呼び出すためのもの。最終行が空行になると確認できた状態で呼び出す
こと。 */
function remove_last_empty_row() {
  // 配置先の行の選択肢のうち、最後のものを削除する。
  remove_choice(document.menu.which_row, TIMELINE_DATA.max_row_num + 1);
  // 最終行を削除して、年表全体の高さを減らす。
  TIMELINE_DATA.max_row_num--;
  TIMELINE_DATA.svg_height -= CONFIG.row_height;
  resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);
  update_v_bars();
}

/* ID が pid の期間と、その期間に関連づけられている出来事がもしあればそれらの
出来事とを、上 (move_up が true の場合) または下 (move_up が false の場合) に
一行分、移動する。
他の関数から呼び出すためのもの。移動先の行が存在することの保証は、呼び出し側で
行うこと。また、移動の結果 (空行の発生など) にも呼び出し側で対処すること。 */
function move_period_and_associated_events_up_or_down(pid, move_up) {
  const row_num_diff = move_up ? -1: 1;
  TIMELINE_DATA.periods.get(pid).row += row_num_diff;
  move_period_and_associated_events(pid, 0, row_num_diff * CONFIG.row_height);
}

/* ID が pid の期間と、その期間に関連づけられている出来事がもしあればそれらの
出来事とを、x 方向に dx だけ、y 方向に dy だけ、動かす。
他の関数から呼び出すためのもの。単純に SVG 要素を移動させるのみの関数。 */
function move_period_and_associated_events(pid, dx, dy) {
  // 開始年・終了年・ラベルを表す text 要素と、期間を表す rect 要素を
  // y 方向において y_diff だけ移動させる。
  const targets = [pid, pid + '_start_year', pid + '_end_year', pid + '_label'];
  targets.forEach(elt_id => { move_svg_elt(elt_id, dx, dy); });

  // この期間に関連づけられた出来事が、0 個以上の任意の個数、存在しうる。
  
  for (let cur_elt = document.getElementById(pid + 'g').firstChild;
       cur_elt !== null; cur_elt = cur_elt.nextSibling) {
    if (cur_elt.nodeName === 'g') { // 出来事を表す g 要素
      // この g 要素の中の circle 要素を y 方向において y_diff だけ移動させる。
      // なお、g 要素は title 要素と circle 要素を一つずつ子要素として含むだけ。
      for (let cur_ev_elt = cur_elt.firstChild;
           cur_ev_elt !== null; cur_ev_elt = cur_ev_elt.nextSibling) {
        if (cur_ev_elt.nodeName == 'circle') {
          move_svg_elt(cur_ev_elt.id, dx, dy, true); break;
        }
        // 改行文字コードの文字要素または title 要素は、無視する。
      }
    }
  }
}

/* 一番上の行にある期間の数を数える。 */
function count_periods_in_first_row() {
  let count = 0;
  TIMELINE_DATA.periods.forEach((p_dat, pid, m) => {
    if (p_dat.row === 1) { count++; }
  });
  return(count);
}

/* 一番下の行にある期間の数を数える。 */
function count_periods_in_last_row() {
  let count = 0;
  TIMELINE_DATA.periods.forEach((p_dat, pid, m) => {
    if (p_dat.row === TIMELINE_DATA.max_row_num) { count++; }
  });
  return(count);
}

/* 「期間を削除」メニュー。 */
function remove_period() {
  if (MODE.f_remove_period > 0) {
    console.log('in remove_period:');  TIMELINE_DATA.print();
  }
  const pid = selected_choice(document.menu.period_to_remove),
    g = document.getElementById(pid + 'g');

  // この期間に関連づけられた出来事があるかもしれない。
  // 出来事を選ぶための各セレクタから、それらの出来事に対応する選択肢を削除。
  for (let cur_elt = g.firstChild; cur_elt !== null; 
       cur_elt = cur_elt.nextSibling) {
    if (cur_elt.nodeName === 'g') { // 出来事を表す g 要素
      const m = cur_elt.id.match(/^(e_\d+)g$/);
      if (m === null || m.length !== 2) {
        alert('Unexpected error in remove_period: ' + m);  reset_svg();  return;
      }
      EVENT_SELECTORS.forEach(sel => { remove_choice(sel, m[1]); });
    }
  }

  // この期間 (と、その内部の出来事) に関する SVG 要素をすべて削除する。
  remove_all_children(g);
  document.getElementById('timeline_body').removeChild(g);

  PERIOD_SELECTORS.forEach(sel => { remove_choice(sel, pid); });
  const deleted_dat = TIMELINE_DATA.periods.get(pid);  // 退避
  TIMELINE_DATA.periods.delete(pid);

  // この期間を削除することによって、年表全体で最も早い年・最も遅い年が変化
  // する可能性がある。また、最初の行または (余白行を除く) 最終行が、空行になる
  // 可能性もある。
  // それらの場合に、年表全体の幅・高さを調整する必要がある。

  if (TIMELINE_DATA.periods.size === 0) {
    // この期間を削除すると、期間が一つもなくなってしまう場合。
    resize_svg(0, 0);
    TIMELINE_DATA.reset_all();
    init_v_bars();
    // 配置先の行を選択するセレクタから、最後の選択肢を削除する。
    remove_choice(document.menu.which_row, 2);
    return;
  }

  // ここから先は、一つ以上の期間が残る場合にのみ実行される。

  // 削除した期間の開始年が年表全体で最も早い年だった場合。
  if (deleted_dat.start_year === TIMELINE_DATA.min_year) {
    // 残りの期間の開始年のうちで最も早い年を求める。
    let new_min_year = CONFIG.max_allowable_year;
    TIMELINE_DATA.periods.forEach((dat, pid, m) => {
      if (dat.start_year < new_min_year) { new_min_year = dat.start_year; }
    });
    // 年表全体で最も早い年が後ろへ繰り下がる場合、幅を調整する。
    if (TIMELINE_DATA.min_year < new_min_year) {
      put_min_year_forward(new_min_year);
      update_v_bars();
    }
  }

  // 削除した期間の終了年が年表全体で最も遅い年だった場合。
  if (deleted_dat.end_year === TIMELINE_DATA.max_year) {
    // 残りの期間の終了年のうちで最も遅い年を求める。
    let new_max_year = CONFIG.min_allowable_year;
    TIMELINE_DATA.periods.forEach((dat, pid, m) => {
      if (new_max_year < dat.end_year) { new_max_year = dat.end_year; }
    });
    // 年表全体で最も遅い年が前へ遡る場合、幅を調整する。
    if (new_max_year < TIMELINE_DATA.max_year) {
      put_max_year_backwards(new_max_year);
      update_v_bars();
    }
  }

  // 削除した期間が最初の行にあり、かつ、最初の行に他の期間がない場合
  if (deleted_dat.row === 1 && count_periods_in_first_row() === 0) {
    // 残っている期間 (と、その中の出来事) をすべて一つずつ上の行にずらす。
    TIMELINE_DATA.periods.forEach((dat, pid, m) => {
      move_period_and_associated_events_up_or_down(pid, true);
    });
    // 最終行を削除して、年表全体の高さを減らす。
    remove_last_empty_row();
  }

  // 削除した期間が (余白行を除く) 最終行にあり、かつ、最終行に他の期間が
  // ない場合
  if (deleted_dat.row === TIMELINE_DATA.max_row_num &&
      count_periods_in_last_row() === 0) {
    // 年表の最終行 (余白行) を削除して、年表全体の高さを減らす (消した期間が
    // あった行が、今からは余白行となる)。
    remove_last_empty_row();
  }

  if (MODE.f_remove_period > 0) { TIMELINE_DATA.print(); }
}

/* 「出来事を追加」メニュー。 */
function add_event() {
  const new_eid = 'e_' + TIMELINE_DATA.next_event_id++;
  const m = document.menu,
    pid = selected_choice(m.period_including_this_event),
    p_dat = TIMELINE_DATA.periods.get(pid),
    event_year = parseInt(m.event_year.value),
    event_label = m.event_label.value;

  m.event_year.value = m.event_label.value = '';

  if (p_dat === undefined) {
    alert('Unexpected error: add_event()');  return;
  }
  if (isNaN(event_year)) {
    const msg = {ja: '出来事の起きた年を整数で入力してください',
                 en: 'Enter an integer for the year when the event occurred.'};
    alert(msg[LANG]);  return;
  }
  if (! p_dat.is_included(event_year)) {
    const msg = {ja: '選択した期間の範囲内の年を入力してください',
                 en: 'Enter a year included within the selected period.'};
    alert(msg[LANG]);  return;
  }
  if (event_label === '') {
    const msg = {ja: 'ラベルを入力してください', en: 'Enter a label.'};
    alert(msg[LANG]);  return;
  }
  add_event_0(new_eid, pid, p_dat, event_year, event_label);
}

/* 「出来事を追加」メニューの実質部分。配色見本の表示などで、フォームからの入力
なしに出来事を描画したい場合があるので、別の関数に分けた。 */
function add_event_0(new_eid, pid, p_dat, event_year, event_label) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('id', new_eid + 'g');

  const e_title = document.createElementNS(SVG_NS, 'title');
  e_title.setAttribute('id', new_eid + '_label');
  add_text_node(e_title, event_label + ' (' + event_year + ')');
  g.appendChild(e_title);  add_text_node(g, '\n');

  const e_circle = document.createElementNS(SVG_NS, 'circle'),
    cx = year_to_x(event_year + 0.5), cy = row_num_to_cy(p_dat.row),
    circle_attr = [['id', new_eid],  ['class', p_dat.base_color_theme],
                   ['cx', cx], ['cy', cy], ['r', CONFIG.circle_radius]];
  circle_attr.forEach(k_v => { e_circle.setAttribute(k_v[0], k_v[1]); });
  g.appendChild(e_circle);  add_text_node(g, '\n');

  const period_g = document.getElementById(pid + 'g');
  period_g.appendChild(g);  add_text_node(period_g, '\n');

  TIMELINE_DATA.events.set(new_eid, event_year);
  EVENT_SELECTORS.forEach(sel => {
    add_selector_option(sel, new_eid, event_label);
  });
}

/* 「出来事を削除」メニュー。 */
function remove_event() {
  const eid = selected_choice(document.menu.event_to_remove),
    g = document.getElementById(eid + 'g');
  remove_all_children(g);
  g.parentNode.removeChild(g);
  EVENT_SELECTORS.forEach(sel => { remove_choice(sel, eid); });
  TIMELINE_DATA.events.delete(eid);
}

/* 「矢印を追加」メニュー。 */
function add_arrow() {
  const new_aid = 'a_' + TIMELINE_DATA.next_arrow_id++;

  const m = document.menu,
    arrow_label = m.arrow_label.value,
    start_point_of_arrow = selected_choice(m.start_point_of_arrow),
    start_period_dat = TIMELINE_DATA.periods.get(start_point_of_arrow),
    end_point_of_arrow = selected_choice(m.end_point_of_arrow),
    end_period_dat = TIMELINE_DATA.periods.get(end_point_of_arrow),
    arrow_shape = selected_radio_choice(m.arrow_shape),
    arrow_color = selected_choice(m.arrow_color),
    arrowed_year = parseInt(m.arrowed_year.value);

  m.arrow_label.value = m.arrowed_year.value = '';
  if (arrow_label === '') {
    const msg = {ja: 'ラベルを入力してください', en: 'Enter a label.'};
    alert(msg[LANG]);  return;
  }
  if (start_point_of_arrow === end_point_of_arrow) {
    const msg = {ja: '別々の期間を指定してください',
                 en: 'Select two different periods.' };
    alert(msg[LANG]);  return;
  }
  if (isNaN(arrowed_year)) {
    const msg = {ja: '矢印を描く年を整数で入力してください',
                 en: 'Enter an integer for the year at which the new arrow is to be positioned.'};
    alert(msg[LANG]);  return;
  }
  if (start_period_dat === undefined || end_period_dat === undefined) {
    alert('Unexpected error: No data for the selected period.');
    return;
  }
  if (start_period_dat.row === end_period_dat.row) {
    const msg = {ja: '同じ段にある期間同士の間には矢印を描画できません',
                 en: 'Cannot draw a vertical arrow between two periods located in the same horizontal row.'};
    alert(msg[LANG]);  return;
  }
  if (! start_period_dat.is_included(arrowed_year)) {
    const msg = {ja: '矢印の始点側の期間の範囲外の年が指定されています',
                 en: 'The specified year is out of the range of the period at the start point of the arrow.'};
    alert(msg[LANG]);  return;
  }
  if (! end_period_dat.is_included(arrowed_year)) {
    const msg = {ja: '矢印の終点側の期間の範囲外の年が指定されています',
                 en: 'The specified year is out of the range of the period at the end point of the arrow.'};
    alert(msg[LANG]);  return;
  }

  const arrow_container_elt = document.getElementById('arrow_container'),
    g = document.createElementNS(SVG_NS, 'g'),
    title = document.createElementNS(SVG_NS, 'title'),
    path = document.createElementNS(SVG_NS, 'path'),
    rect = document.createElementNS(SVG_NS, 'rect'),
    text = document.createElementNS(SVG_NS, 'text');

  add_text_node(arrow_container_elt, '\n');
  arrow_container_elt.appendChild(g);
  add_text_node(arrow_container_elt, '\n');
  add_text_node(g, '\n');  g.appendChild(title);
  add_text_node(g, '\n');  g.appendChild(path);  //add_text_node(g, '\n');
  add_text_node(g, '\n');  g.appendChild(rect);  //add_text_node(g, '\n');
  add_text_node(g, '\n');  g.appendChild(text);  add_text_node(g, '\n');

  //g.setAttribute('id', new_aid + '_g');
  g.id = new_aid + '_g';
  title.id = new_aid + '_label';
  add_text_node(title, '(' + arrowed_year + ')');

  const y_vals = row_nums_to_arrow_y_vals(start_period_dat.row, 
                   end_period_dat.row, (arrow_shape === 'double_headed')),
    y_start = y_vals.y_start, y_end = y_vals.y_end;

  const x_center = year_to_x(arrowed_year) + 
                   Math.round(CONFIG.year_to_px_factor / 2),
    marker_url = 'url(#' + arrow_color + '_arrow_head)',
    d_str = 'M ' + x_center + ',' + y_start + 
            ' l 0,' + (y_end - y_start).toString(),
    stroke_color = ARROW_COLORS.find(dat => {
      return(dat.id === arrow_color); }).arrow_color;
  [['id', new_aid], ['class', 'arrow'], ['marker-end', marker_url],
   ['d', d_str], ['stroke', stroke_color]].forEach((k_v) => { 
    path.setAttribute(k_v[0], k_v[1]);
  });
  if (arrow_shape === 'double_headed') {
    path.setAttribute('marker-start', marker_url);
  }

  const y_label_top = Math.round((y_start + y_end) / 2 - CONFIG.font_size / 2),
    label_width = arrow_label.length * CONFIG.font_size,
    x_label_left = x_center - Math.round(label_width / 2);
/*
  console.log('y_start: ' + y_start);
  console.log('y_end: ' + y_end);
  console.log('y_label_top: ' + y_label_top);
  console.log('label_width: ' + label_width);
*/
  [['id', new_aid + '_r'], ['class', 'arrow'],
   ['x', x_label_left], ['y', y_label_top],
   ['width', label_width], ['height', CONFIG.font_size]].forEach((k_v) => {
    rect.setAttribute(k_v[0], k_v[1]);
  });
  [['id', new_aid + '_t'], ['class', 'arrow'],
   ['x', x_label_left], ['y', y_label_top],
   ['dx', 0], ['dy', CONFIG.font_size],
   ['textLength', label_width]].forEach((k_v) => {
    text.setAttribute(k_v[0], k_v[1]);
  });
  add_text_node(text, arrow_label);

  const a_dat = new arrow_data(start_point_of_arrow, end_point_of_arrow, arrowed_year, x_center, y_start, y_end);
  TIMELINE_DATA.arrows.set(new_aid, a_dat);
  g.dataset.start_period_id = start_point_of_arrow;
  g.dataset.end_period_id = end_point_of_arrow;
  g.dataset.arrowed_year = arrowed_year;
  g.dataset.x_center = x_center;
  g.dataset.y_start = y_start;
  g.dataset.y_end = y_end;

  ARROW_SELECTORS.forEach(sel => {
    add_selector_option(sel, new_aid, '[' + arrowed_year + '] ' + arrow_label);
  });
}

/* 「矢印を削除」メニュー。 */
function remove_arrow() {
  const aid = selected_choice(document.menu.arrow_to_remove);
  remove_arrow_0(aid);
}
function remove_arrow_0(aid) {
  const g = document.getElementById(aid + '_g');
  remove_all_children(g);
  g.parentNode.removeChild(g);
  ARROW_SELECTORS.forEach(sel => { remove_choice(sel, aid); });
  TIMELINE_DATA.arrows.delete(aid);
}

/* 「ダウンロードする」メニュー。 */
function download_svg() {
  const s = document.getElementById('timeline_container').innerHTML,
        b = new Blob([s], {type :'image/svg+xml'});
  // ダウンロード用リンクを作る。
  const a = document.createElement('a');
  document.getElementsByTagName('body')[0].appendChild(a);
  a.download = 'timeline.svg';
  // Blob へのリンク URL を生成し、それを a 要素の href 属性に設定する。
  a.href = URL.createObjectURL(b);
  a.click();
}

/* 「作成済みのデータを読み込む」メニュー。 */
function read_in() {
  const reader = new FileReader();
  reader.onload = function (e) {
    // 読み込んだテキストの内容を、div 要素 (IDは 'timeline_container') の中身
    // として書き出す。
    document.getElementById('timeline_container').innerHTML = e.target.result;
    set_read_values();
  }
  // テキストファイルとして読み込む。
  reader.readAsText(document.getElementById('input_svg_file').files[0]);
}

/* 「作成済みのデータを読み込む」メニュー。 */
function set_read_values() {
  // (1) セレクタの選択肢を初期化。フォームの各入力もリセットしておく。
  PERIOD_SELECTORS.forEach(sel => { remove_all_children(sel); });
  EVENT_SELECTORS.forEach(sel => { remove_all_children(sel); });
  const menu = document.menu, which_row = menu.which_row;
  remove_all_children(which_row);
  menu.reset();

  // (2) 年表全体に関する値の確認・設定
  const svg_elt = document.getElementById('timeline');
  TIMELINE_DATA.reset_all();

  // (2-1) 幅と高さ
  const svg_width = parseInt(svg_elt.getAttribute('width')),
        svg_height = parseInt(svg_elt.getAttribute('height'));
  if (isNaN(svg_width)) {
    const msg = {ja: '幅が不正です', en: 'An illegal width is specified.'};
    alert(msg[LANG]);  reset_svg();  return;
  }
  if (isNaN(svg_height)) {
    const msg = {ja: '高さが不正です', en: 'An illegal height is specified.'};
    alert(msg[LANG]);  reset_svg();  return;
  }
  TIMELINE_DATA.svg_width = svg_width;
  TIMELINE_DATA.svg_height = svg_height;

  // (2-2) 行数 (高さとの整合性も確かめる)
  const body_h = svg_height - CONFIG.header_row_height;
  let illegal_height = true, total_rows = 0;
  if (body_h % CONFIG.row_height === 0) {
    total_rows = body_h / CONFIG.row_height;  // 最後の空白行も含めた行数
    if (parseInt(svg_elt.dataset.max_row_num) === total_rows - 1) {
      // 空白行を除く、使用済みの行番号の最大値 (1 から数える)
      TIMELINE_DATA.max_row_num = total_rows - 1;
      illegal_height = false;
    }
  }
  if (illegal_height) {
    const msg = {ja: '高さと行数が不整合です',
                 en: 'The height is inconsistent with the maximum row number.'};
    console.log(`svg_height=${svg_height}, body_h=${body_h}`);
    alert(msg[LANG]);  reset_svg();  return;
  }

  // (2-3) 行番号が最大の行の次の行 (つまり空白行) のぶんまで選択肢を追加する。
  for (let i = 1; i <= total_rows; i++) {
    add_selector_option(which_row, i, i + '行目');
  }

  // (2-4) 最も早い年と最も遅い年 (幅との整合性も確かめる)
  const min_year = parseInt(svg_elt.dataset.min_year),
    max_year = parseInt(svg_elt.dataset.max_year);
  if (isNaN(min_year) || min_year < CONFIG.min_allowable_year) {
    const msg = {ja: '最も早い年が不正です',
                 en: 'An illegal value is specified as the earliest year.'};
    alert(msg[LANG]);  reset_svg();  return;
  }
  if (isNaN(max_year) || CONFIG.max_allowable_year < max_year) {
    const msg = {ja: '最も遅い年が不正です',
                 en: 'An illegal value is specified as the latest year.'};
    alert(msg[LANG]);  reset_svg();  return;
  }
  if (max_year <= min_year) {
    const msg = {ja: '最も遅い年は、最も早い年より後の年でなくてはなりません',
                 en: 'A year later than the earliest year must be specified as the latest year.'};
    alert(msg[LANG]);  reset_svg();  return;
  }
  TIMELINE_DATA.min_year = min_year;
  TIMELINE_DATA.max_year = max_year;
  set_year_range();
  const year_span = max_year + 1 - min_year + CONFIG.h_margin_in_year * 2;
  if (year_span * CONFIG.year_to_px_factor !== svg_width) {
    const msg = {ja: '最も早い年から最も遅い年までの長さと幅とが不整合です',
                 en: 'The span between the earliest year and the latest year is inconsistent with the width.'};
    console.log(`min_year=${min_year}, max_year=${max_year}, year_span=${year_span}, svg_width=${svg_width}`);
    alert(msg[LANG]);  reset_svg();  return;
  }

  // (3) 配色テーマの確認。
  // (a) 読み取ったデータと themes.js で ID が同一のテーマは、読み取った
  // データが優先。
  // (b) 読み取ったデータにのみ含まれるテーマは、そのまま残す。
  // (c) 読み取ったデータになく themes.js にのみあるテーマを追加する。
  // ……という方針にしたいので、基本的には読み取ったデータはそのまま放置し
  // (明示的には何もしないことによって (a) と (b) を達成し)、(c) のみ明示的に
  // 実行する。
  const  style_elt = document.getElementById('theme_style_def'),
    defs_elt = document.getElementById('gradient_def'),
    stop_L_offset_str = CONFIG.fading_region_ratio + '%',  // '15%' となる
    stop_R_offset_str = 
      parseInt(100 - CONFIG.fading_region_ratio).toString() +'%';  // '85%';
  COLOR_THEMES.forEach(th => {
    // この配色テーマで、出来事を表す円のための CSS 規則がなければ追加する。
    const circle_class_re = new RegExp('circle.' + th.id + '\\s*\\{.+\\}');
    //console.log('circle_class_re=' + circle_class_re);
    if (! circle_class_re.test(style_elt.innerHTML)) {
      style_elt.innerHTML += ('\n' + 'circle.' + th.id + ' { fill: ' + 
        th.circle_fill + '; stroke: ' + th.circle_stroke + '; }\n');
    }
    // この配色テーマで、年を表すテキストのための CSS 規則がなければ追加する。
    const text_class_re = new RegExp('text.' + th.id + '\\s*\\{.+\\}');
    if (! text_class_re.test(style_elt.innerHTML)) {
      style_elt.innerHTML += ('\n' + 'text.' + th.id +
        ' { fill: ' + th.text_fill + '; }\n');
    }
    // 左右両端のグラデーション有無による合計 4 パタンの linearGradient 要素の
    // それぞれについて、有無を調べ、なければ追加する。
    add_grad_if_not_exists(true, true, th);
    add_grad_if_not_exists(true, false, th);
    add_grad_if_not_exists(false, true, th);
    add_grad_if_not_exists(false, false, th);
    // なお、配色テーマを選択肢とするセレクタは更新無用である。
    // なぜなら、第一に、window.top.onload から関数 reset_svg が呼ばれ、そこから
    // 関数 set_theme_defs が呼ばれ、その中で COLOR_THEMES の各要素に相当する
    // 選択肢が追加されているから。
    // そして第二に、COLOR_THEMES で定義されていない配色テーマで、読み込んだ
    // ファイル内の linearGradient 要素に相当するものは、セレクタの選択肢として
    // 追加する必要がない、と判断したから (そのような配色テーマは、themes.js から
    // 既存の配色テーマの定義を削除しない限りは、ユーザが手作業で編集したことに
    // よって生じたものに限定される筈である。そういう自由度の高いものまでをも、
    // 今から行う続きの編集作業のために選択肢として用意しておくべきかどうかは
    // 疑問である。仮にそれを使いたければ、またユーザが後で手作業で編集すればよい
    // だけである。選択肢に反映されなくても、現にその配色テーマが指定されている
    // 要素はその配色テーマの定義に従って表示される筈だから、上記 (b) の方針には
    // かなっている)。
  });

  // 上記 (3) の処理のための関数定義。
  // 関数 set_theme_defs の内部関数 add_grad とほぼ同じなので、いずれまとめる
  // かもしれない。が、微妙に違う部分をパラメタで切り分けるよりはこのままの方が
  // 良いかもしれない。あとで考えよう。
  function add_grad_if_not_exists(left_open, right_open, color_theme) {
    let grad_id = color_theme.id;
    grad_id += (left_open ? '_open' : '_closed');
    grad_id += (right_open ? '_open' : '_closed');
    let grad = document.getElementById(grad_id);
    if (grad !== null) {
      if (grad.tagName.toLowerCase() === 'lineargradient') {
        return;
      } else {
        alert('Unexpected error: <' + grad.tagName + '> element with the ID "' + 
          grad_id +'" is found.');
        return;
      }
    }
    // 以下は、指定された配色テーマかつ指定されたグラデーションのパタンでの
    // linearGradient 要素が存在しない場合にのみ実行される。
    grad = document.createElementNS(SVG_NS, 'linearGradient');
    //console.log('grad_id=' + grad_id);
    grad.setAttribute('id', grad_id);
    add_text_node(grad, '\n');
    // 左側
    // 左端 (左端から 0% の場所) の stop 要素
    const stop_0 = document.createElementNS(SVG_NS, 'stop');
    stop_0.setAttribute('offset', '0%');
    if (left_open) {
      stop_0.setAttribute('stop-opacity', color_theme.bar_fading_end_opacity);
      stop_0.setAttribute('stop-color', color_theme.bar_color);
      grad.appendChild(stop_0);  add_text_node(grad, '\n');
      // 左端からのグラデーションの部分と、それより中心側のべた塗りの部分との
      // 境界に当たる stop 要素
      const stop_L = document.createElementNS(SVG_NS, 'stop');
      stop_L.setAttribute('offset', stop_L_offset_str);
      stop_L.setAttribute('stop-opacity', color_theme.bar_body_opacity);
      stop_L.setAttribute('stop-color', color_theme.bar_color);
      grad.appendChild(stop_L);  add_text_node(grad, '\n');
    } else {
      stop_0.setAttribute('stop-opacity', color_theme.bar_body_opacity);
      stop_0.setAttribute('stop-color', color_theme.bar_color);
      grad.appendChild(stop_0);  add_text_node(grad, '\n');
    }
    // 右側
    // 右端 (左端から 100% の場所) の stop 要素
    const stop_100 = document.createElementNS(SVG_NS, 'stop');
    stop_100.setAttribute('offset', '100%');
    if (right_open) {
      // 右端からのグラデーションの部分と、それより中心側のべた塗りの部分との
      // 境界に当たる stop 要素
      const stop_R = document.createElementNS(SVG_NS, 'stop');
      stop_R.setAttribute('offset', stop_R_offset_str);
      stop_R.setAttribute('stop-opacity', color_theme.bar_body_opacity);
      stop_R.setAttribute('stop-color', color_theme.bar_color);
      grad.appendChild(stop_R);  add_text_node(grad, '\n');
      stop_100.setAttribute('stop-opacity', color_theme.bar_fading_end_opacity);
      stop_100.setAttribute('stop-color', color_theme.bar_color);
      grad.appendChild(stop_100);  add_text_node(grad, '\n');
    } else {
      stop_100.setAttribute('stop-opacity', color_theme.bar_body_opacity);
      stop_100.setAttribute('stop-color', color_theme.bar_color);
      grad.appendChild(stop_100);  add_text_node(grad, '\n');
    }
    add_text_node(defs_elt, '\n');
    defs_elt.appendChild(grad);
    add_text_node(defs_elt, '\n');
  }

  // (4) 各期間の確認と、(5) 出来事の確認。
  const timeline_body_elt = document.getElementById('timeline_body'),
    period_g_elts = timeline_body_elt.children,
    p_num = period_g_elts.length;
  if (p_num > 0) { TIMELINE_DATA.init_state = false; }
  let next_period_id = 0, next_event_id = 0;

  // ループの中で continue と return を使いたいので、forEach ではなく for を使う。
  for (let i = 0; i < p_num; i++) {
    const cur_g = period_g_elts[i];
    if (cur_g.tagName !== 'g' && cur_g.tagName !== 'G') {
      continue;
    }
    const pid_m = cur_g.getAttribute('id').match(/^p_(\d+)g$/);
    if (pid_m === null || pid_m.length !== 2) {
      const msg = {ja: pid_m[0] + 'は不正な期間IDです', 
                   en: pid_m[0] + ' is an illegal period ID.'};
      alert(msg[LANG]);  reset_svg();  return;
    }

    const pid_num = parseInt(pid_m[1]), // ID の数字部分を取り出す。
       cur_pid = 'p_' + pid_num,
       cur_p = document.getElementById(cur_pid); // rect 要素
    if (next_period_id <= pid_num) { next_period_id = pid_num + 1; }
    if (cur_p === null) {
       const msg = {ja: '期間 ' + cur_pid + ' を表す矩形が見つかりません',
                    en: 'No rectangle for period ' + cur_pid + ' is found.'};
       alert(msg[LANG]);  reset_svg();  return;
    }

    const x = parseInt(cur_p.getAttribute('x')),
      y = parseInt(cur_p.getAttribute('y')),
      w = parseInt(cur_p.getAttribute('width')),
      fill = cur_p.getAttribute('fill'),
      r = rect_y_to_row_num(y),
      start_year = x_to_year(x),
      end_year = start_year + (w / CONFIG.year_to_px_factor) - 1,
      fill_m = fill.match(/^url\(#([a-zA-Z_]\w*)_(closed|open)_(closed|open)\)$/);
    if  (fill_m === null || fill_m.length !== 4) {
      const msg = {ja: fill_m[0] + ' は不正な配色テーマ指定です',
                   en: 'The color theme is incorrectly specified as ' + fill_m[0] + '.'};
      alert(msg[LANG]);  reset_svg();  return;
    }
    const color_theme = fill_m[1] + '_' + fill_m[2] + '_' + fill_m[3];
    const p_dat = new period_data(start_year, end_year, r, fill_m[1], color_theme);
    TIMELINE_DATA.periods.set(cur_pid, p_dat);
    // この期間に相当する選択肢をセレクタに追加
    const period_label_txt = 
      document.getElementById(cur_pid + '_label').textContent;
    PERIOD_SELECTORS.forEach(sel => {
      add_selector_option(sel, cur_pid, period_label_txt);
    });

    // (5) 出来事の確認。
    const event_node_candidates = cur_g.children, 
      e_num = event_node_candidates.length,
      rect_mid_y = y + parseInt(CONFIG.bar_height / 2);
    // continue と return を使いたいので、forEach ではなく for を使う。
    for (let j = 0; j < e_num; j++) {
      const cur_ev = event_node_candidates[j];
      if (cur_ev.tagName !== 'g' && cur_ev.tagName !== 'G') {
        continue;
      }
      const eid_m = cur_ev.getAttribute('id').match(/^e_(\d+)g$/);
      if (eid_m === null || eid_m.length !== 2) {
        const msg = {ja: eid_m[0] + 'は不正な出来事IDです', 
                     en: eid_m[0] + ' is an illegal event ID.'};
        alert(msg[LANG]);  reset_svg();  return;
      }
      const eid_num = parseInt(eid_m[1]), cur_eid = 'e_' + eid_num,
        cur_e = document.getElementById(cur_eid); // circle 要素
      if (next_event_id <= eid_num) { next_event_id = eid_num + 1; }
      if (cur_e === null) {
        const msg = {ja: '出来事 ' + cur_eid + ' を表す円が見つかりません',
                      en: 'No circle for event ' + cur_eid + ' is found.'};
         alert(msg[LANG]);  reset_svg();  return;
      }
      const cx = parseInt(cur_e.getAttribute('cx')),
        cy = parseInt(cur_e.getAttribute('cy')),
        event_year = cx_to_year(cx);
      if (cy !== rect_mid_y) {
        const msg = {ja: '期間 ' + cur_pid + ' と出来事 ' + cur_eid + 
                         ' の位置がずれています',
                     en: 'Period ' + cur_pid + ' and event ' + cur_eid + 
                         ' must be aligned.'}
        alert(msg[LANG]);  reset_svg();  return;
      }
      if (cx < x || x + w < cx) { // 厳密な条件ではないが、とりあえず。
        const msg = {ja: '出来事 ' + cur_eid + ' が期間 ' + cur_pid + 
                         ' の外にあります',
                     en: 'Event ' + cur_eid + 
                         ' must be included within period ' + cur_pid + '.'}
        alert(msg[LANG]);  reset_svg();  return;
      }
      TIMELINE_DATA.events.set(cur_eid, event_year);
      const event_label_txt = 
        document.getElementById(cur_eid + '_label').textContent;
      EVENT_SELECTORS.forEach(sel => {
        add_selector_option(sel, cur_eid, event_label_txt);
      });
    }
  }

  // 期間の ID 用に使用済みの番号のうちの最大値よりも 1 だけ大きい値
  // (または、期間が一つも定義されていなかった場合は、0)
  TIMELINE_DATA.next_period_id = next_period_id;
  // 出来事についても同様。
  TIMELINE_DATA.next_event_id = next_event_id;

  // (6) 縦の目盛線と横罫線を再描画する (妥当性を確認するよりも強制的に再描画
  // する方が楽で確実なので)。
  // ただし、TIMELINE_DATA.v_bars の設定だけは先にしておく (そうしないと同じ年の
  // 目盛線が重複して作られてしまうため)。
  for (let cur_v = document.getElementById('header_and_v_bars').firstChild;
       cur_v !== null; cur_v = cur_v.nextSibling) {
    if (cur_v.nodeName === 'line') {
      const vid_m = cur_v.id.match(/^v_bar_(\d+)$/);
      if (vid_m !== null && vid_m.length === 2) {  // 横罫線は無視
        TIMELINE_DATA.v_bars.add(parseInt(vid_m[1]));
      }
    }
  }
  update_v_bars();
}

/* 「配色見本を表示する」メニュー。 */
function show_color_samples() {
  const conf_msg = {
    ja: '現在の年表データを消してもよい場合は [OK] をクリックしてください。',
    en: 'Click [OK] if it is acceptable to delete the current data.'
  };
  if (! confirm(conf_msg[LANG])) { return; }

  // セレクタの選択肢、フォームの各入力、管理用データ、SVG データ、
  // これらすべてをリセットする。
  PERIOD_SELECTORS.forEach(sel => { remove_all_children(sel); });
  EVENT_SELECTORS.forEach(sel => { remove_all_children(sel); });
  const menu = document.menu, which_row = menu.which_row;
  remove_all_children(which_row);
  menu.reset();
  TIMELINE_DATA.reset_all();
  reset_svg();

  const start_year = 123, end_year = 198, event_year = 156;  // 適当な定数
  let right_side_open = true, row_num = 1;
  // 各配色テーマで一つずつ期間と出来事を描画する。行ごとに交替で右端・左端を
  // グラデーションにしてみた。
  COLOR_THEMES.forEach(th => {
    const new_pid = 'p_' + TIMELINE_DATA.next_period_id++,
      start_year_type = right_side_open ? 'actual' : 'dummy',
      end_year_type = right_side_open ? 'dummy' : 'actual';
    add_period_0(new_pid, start_year, start_year_type, end_year, end_year_type, 
                 th.name[LANG], row_num, th.id);
    right_side_open = (!right_side_open);
    row_num++;
    const new_eid = 'e_' + TIMELINE_DATA.next_event_id++;
    add_event_0(new_eid, new_pid, TIMELINE_DATA.periods.get(new_pid), 
                event_year, 'test');
  });
}
