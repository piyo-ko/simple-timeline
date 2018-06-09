'use strict';

/* SVG 用の名前空間 */
const SVG_NS = 'http://www.w3.org/2000/svg';
/* ページの言語。日本語がデフォルト。英語 (en) のページも後で作る。 */
let LANG = 'ja';

/* 入力フォーム中の期間・出来事を表すセレクタを要素とする配列。 */
const PERIOD_SELECTORS = new Array(), EVENT_SELECTORS = new Array();

/* 各期間について管理するためのオブジェクト */
class period_data {
  constructor(start_year, end_year, row, color_theme) {
    this.start_year = start_year;
    this.end_year = end_year;
    this.row = row;
    this.color_theme = color_theme;
  }
  print() { console.log(JSON.stringify(this)); }
}

/* デバッグ対象の関数に対応するプロパティを 0 以上の値に設定すること。 */
const MODE = {
  f_add_period: 0,
  f_update_v_bars: 0,
  f_remove_period: 0
};

/* 年表全体の現状を管理する大域オブジェクト。 */
var TIMELINE_DATA = TIMELINE_DATA || {
  next_period_id: 0, 
  next_event_id: 0, 
  max_row_num: 0,  // 1 行目は 1 と数える。0 は何も期間がないことを表す。
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
    let s =   'v_bars: ';
    this.v_bars.forEach(year => { s += year + ','; });
    console.log(s);
  }
};

/* 各種定数 */
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

  if (PERIOD_SELECTORS.length === 0) {
    PERIOD_SELECTORS.push(m.period_to_re_label, m.period_to_remove);
  }

/*
  if (EVENT_SELECTORS.length === 0) {
    EVENT_SELECTORS.push(m.   );
  }
*/
  reset_svg();
  return(true);
}

/* svg 要素を初期状態に戻してから、配色テーマを読み取ってその定義を追加する。 */
function reset_svg() {
  resize_svg(0, 0);
  document.getElementById('theme_style_def').innerHTML = '';
  document.getElementById('gradient_def').innerHTML = '';
  document.getElementById('header_and_v_bars').innerHTML = '';
  document.getElementById('timeline_body').innerHTML = '';

  set_theme_defs();
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
  if (! check_theme_ids()) {
    alert('Error in themes.js.\nPlease correct themes.js.');
    return(false);
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
  });
}

/* 配色テーマの定義に使われる ID についての簡易チェック。 */
function check_theme_ids() {
  // ID に重複がないことを確認
  const ids = COLOR_THEMES.map(th => { return(th.id); }).sort(), L = ids.length;
  for (let i = 0; i < L-1; i++) { if (ids[i] === ids[i+1]) { return(false); } }
  // ID の形式を確認
  const re = /^[a-zA-Z_]\w*$/;
  for (let i = 0; i < L; i++) { if (! re.test(ids[i]))  { return(false); } }
  // ここに来るのは問題がない場合のみ
  return(true);
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

  if (isNaN(start_year)) {
    const msg = {ja: '開始年は整数を入力してください', 
                 en: 'Enter an integer for the start year.'};
    alert(msg[LANG]);  return;
  }
  if (isNaN(end_year)) {
    const msg = {ja: '終了年は整数を入力してください', 
                 en: 'Enter an integer for the end year.'};
    alert(msg[LANG]);  return;
  }
  if (period_label === '') {
    const msg = {ja: 'ラベルを入力してください', en: 'Enter a label.'};
    alert(msg[LANG]);  return;
  }
  if (end_year <= start_year) {
    const msg = {
      ja: '開始年以前の終了年を指定しないでください',
      en: 'Do not enter the end year that is earlier than or equal to the start year.'
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
    resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);

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
      if (TIMELINE_DATA.max_row_num + 1 !== which_row) {
        alert('Unexpected error: TIMELINE_DATA.max_row_num + 1 !== which_row');
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

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('id', new_pid + 'g');

  const row_start_y = CONFIG.header_row_height + 
                        (which_row - 1) * CONFIG.row_height;

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
        ['dx', 0], ['dy', CONFIG.font_size]];
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
        ['dx', 0], ['dy', CONFIG.font_size]];
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
      ['dx', 0], ['dy', CONFIG.font_size]];
  label_attr.forEach(k_v => { label_txt.setAttribute(k_v[0], k_v[1]); });
  add_text_node(label_txt, period_label);
  g.appendChild(label_txt);  add_text_node(g, '\n');

  timeline_body_elt.appendChild(g);  add_text_node(timeline_body_elt, '\n');

  const p_dat = new period_data(start_year, end_year, which_row, color_theme);
  TIMELINE_DATA.periods.set(new_pid, p_dat);
  if (MODE.f_add_period > 0) { console.log('add_period():'); }
  TIMELINE_DATA.print();
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

  if (MODE.update_v_bars > 0) {
    console.log('min_y_incl_margin=' + min_y_incl_margin);
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
      const v = document.getElementById('v_bar_' + y),
        v_txt = document.getElementById('v_bar_txt_' + y);
      header_elt.removeChild(v);
      header_elt.removeChild(v_txt);
    }
  });

  // min_y 年から max_y 年までの目盛を描画する。
  for (let year = min_y; year <= max_y; 
           year += CONFIG.vertical_bar_interval_in_year) {
    // year 年の目盛に対応する x 座標と、この目盛用のテキスト要素の幅。
    const x = (year - TIMELINE_DATA.min_year + CONFIG.h_margin_in_year) *
                CONFIG.year_to_px_factor,
        txt_span = year.toString().length * CONFIG.monospace_char_width;
    if (TIMELINE_DATA.v_bars.has(year)) { // year 年の縦線が存在する場合。
      const v = document.getElementById('v_bar_' + year),
        v_attr = [['x1', x], ['x2', x], ['y2', y_bottom]]; // y1 は変化しない。
      v_attr.forEach(k_v => { v.setAttribute(k_v[0], k_v[1]); });
      const v_txt = document.getElementById('v_bar_txt_' + year);
      v_txt.setAttribute('x', x - txt_span/2); // x 以外は変化しない。
    } else { // year 年の縦線が存在しないので、新たに作成する。
      const v = document.createElementNS(SVG_NS, 'line'),
        v_attr = [['id', 'v_bar_' + year], ['class', 'v_bar'],
          ['x1', x], ['y1', CONFIG.txt_region_in_header_row],
          ['x2', x], ['y2', y_bottom]];
      v_attr.forEach(k_v => { v.setAttribute(k_v[0], k_v[1]); });
      header_elt.appendChild(v);

      const v_txt = document.createElementNS(SVG_NS, 'text'),
        txt_attr = [['id', 'v_bar_txt_' + year], ['class', 'year v_bar'],
          ['x', x - txt_span/2], ['y', 0], ['dx', 0], ['dy', CONFIG.font_size]];
      add_text_node(v_txt, year);
      txt_attr.forEach(k_v => { v_txt.setAttribute(k_v[0], k_v[1]); });
      header_elt.appendChild(v_txt);

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

  const diff_year = TIMELINE_DATA.min_year - new_start_year, // 正になる
    diff_x = diff_year * CONFIG.year_to_px_factor;
  TIMELINE_DATA.svg_width += diff_x;
  resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);
  TIMELINE_DATA.min_year = new_start_year;
  TIMELINE_DATA.periods.forEach((p_data, pid, m) => {
    move_svg_elt(pid, diff_x, 0);
    move_svg_elt(pid + '_start_year', diff_x, 0);
    move_svg_elt(pid + '_end_year', diff_x, 0);
    move_svg_elt(pid + '_label', diff_x, 0);
  });
}

/* 種々の期間の開始年のうちで最も早い年 (TIMELINE_DATA.min_year) を 
new_start_year 年まで遅らせる。それに応じて、年表全体の幅を狭め、既存の要素 
(矩形、テキスト等) を左へずらす。 */
function put_min_year_forward(new_start_year) {
  if (TIMELINE_DATA.init_state || new_start_year <= TIMELINE_DATA.min_year) {
    return;
  }

  const diff_year = new_start_year - TIMELINE_DATA.min_year, // 正になる
    diff_x = diff_year * CONFIG.year_to_px_factor;
  TIMELINE_DATA.svg_width -= diff_x;
  resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);
  TIMELINE_DATA.min_year = new_start_year;
  TIMELINE_DATA.periods.forEach((p_data, pid, m) => {
    move_svg_elt(pid, -diff_x, 0);
    move_svg_elt(pid + '_start_year', -diff_x, 0);
    move_svg_elt(pid + '_end_year', -diff_x, 0);
    move_svg_elt(pid + '_label', -diff_x, 0);
  });
}

/* 種々の期間の開始年のうちで最も遅い年 (TIMELINE_DATA.max_year) を
new_end_year 年まで遅らせる。それに応じて、年表全体の幅を広げる。既存の要素 
(矩形、テキスト等) の位置は変化しない。 */
function put_max_year_forward(new_end_year) {
  if (TIMELINE_DATA.init_state || new_end_year <= TIMELINE_DATA.max_year) {
    return;
  }

  const diff_year = new_end_year - TIMELINE_DATA.max_year, // 正になる
    diff_x = diff_year * CONFIG.year_to_px_factor;
  TIMELINE_DATA.svg_width += diff_x;
  resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);
  TIMELINE_DATA.max_year = new_end_year;
}

/* 種々の期間の開始年のうちで最も遅い年 (TIMELINE_DATA.max_year) を
new_end_year 年まで遡らせる。それに応じて、年表全体の幅を狭める。既存の要素 
(矩形、テキスト等) の位置は変化しない。 */
function put_max_year_backwards(new_end_year) {
  if (TIMELINE_DATA.init_state || TIMELINE_DATA.max_year <= new_end_year) {
    return;
  }

  const diff_year = TIMELINE_DATA.max_year - new_end_year, // 正になる
    diff_x = diff_year * CONFIG.year_to_px_factor;
  TIMELINE_DATA.svg_width -= diff_x;
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

/* 「期間を削除」メニュー。 */
function remove_period() {
  if (MODE.f_remove_period > 0) {
    console.log('in remove_period:');
    TIMELINE_DATA.print();
  }
  const pid = selected_choice(document.menu.period_to_remove),
    g = document.getElementById(pid + 'g');
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
  } else { // 一つ以上の期間が残る場合
    let need_to_update_v_bars = false;  // update_v_bars() する必要があるか

    // 削除した期間の開始年が年表全体で最も早い年だった場合。
    if (deleted_dat.start_year === TIMELINE_DATA.min_year) {
      // 残りの期間の開始年のうちで最も早い年を求める。
      let new_min_year = CONFIG.max_allowable_year;
      TIMELINE_DATA.periods.forEach((dat, pid, m) => {
        if (dat.start_year < new_min_year) { new_min_year = dat.start_year; }
      });
      // 年表全体で最も早い年が後ろへ繰り下がる場合、幅を調整する。
      if (TIMELINE_DATA.min_year < new_min_year) {
        need_to_update_v_bars = true;
        put_min_year_forward(new_min_year);
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
        need_to_update_v_bars = true;
        put_max_year_backwards(new_max_year);
      }
    }

    // 削除した期間が最初の行に配置されていた場合。
    if (deleted_dat.row === 1) {
      let found = false;
      TIMELINE_DATA.periods.forEach((dat, pid, m) => {
        if (dat.row === 1) { found = true; }
      });
      if (! found) { // 最初の行に他の期間がない場合。
        need_to_update_v_bars = true;
        // 残っている期間をすべて一つずつ上の行にずらす。
        TIMELINE_DATA.periods.forEach((dat, pid, m) => {
          dat.row--;
          const targets = [pid, pid + '_start_year', pid + '_end_year',
                           pid + '_label'];
          targets.forEach(elt_id => {
            const elt = document.getElementById(elt_id);
            if (elt !== null) {
              const y = parseInt(elt.getAttribute('y')) - CONFIG.row_height;
              elt.setAttribute('y', y);
            }
          });
        });
        // 配置先の行を選択するセレクタから、最後の選択肢を削除する。
        remove_choice(document.menu.which_row, TIMELINE_DATA.max_row_num + 1);
        // 最終行を削除して、年表全体の高さを減らす。
        TIMELINE_DATA.max_row_num--;
        TIMELINE_DATA.svg_height -= CONFIG.row_height;
        resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);
      }
    }

    // 削除した期間が、(余白行を除く) 最終行に配置されていた場合。
    if (deleted_dat.row === TIMELINE_DATA.max_row_num) {
      let found = false;
      TIMELINE_DATA.periods.forEach((dat, pid, m) => {
        if (dat.row === TIMELINE_DATA.max_row_num) { found = true; }
      });
      if (! found) { // 最終行に他の期間がない場合。
        need_to_update_v_bars = true;
        // 配置先の行を選択するセレクタから、最後の選択肢を削除する。
        remove_choice(document.menu.which_row, deleted_dat.row + 1);
        // 年表の最終行 (余白行) を削除して、年表全体の高さを減らす
        // (消した期間があった行が、余白行となる)。
        TIMELINE_DATA.max_row_num--;
        TIMELINE_DATA.svg_height -= CONFIG.row_height;
        resize_svg(TIMELINE_DATA.svg_width, TIMELINE_DATA.svg_height);
      }
    }

    if (need_to_update_v_bars) { update_v_bars(); }

    if (MODE.f_remove_period > 0) {
      TIMELINE_DATA.print();
      console.log('need_to_update_v_bars=' + need_to_update_v_bars);
    }
  }
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
    // **** TO DO **** SVGの各要素を読み取って、変数の設定を行う。
    const b = {ja: '作成済みのデータを読み込む', 
               en: 'reading data saved before'};
  }
  // テキストファイルとして読み込む。
  reader.readAsText(document.getElementById('input_svg_file').files[0]);
}
