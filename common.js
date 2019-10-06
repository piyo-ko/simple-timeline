'use strict';

/*** 配列操作 ***/

/* 配列から所定の値の要素 (のうち最初のもの) を取り除く。 */
function remove_val_from_array(arr, val) {
  const cur_len = arr.length;
  if (cur_len === 0) { return; }
  let i, j;
  for (i = 0; i < cur_len; i++) { if (arr[i] === val) { break; } }
  if (i === cur_len) { return; } // val は arr の中にない。
  for (j = i; j+1 < cur_len; j++) { arr[j] = arr[j+1]; }
  arr.length--;
}

/* 配列 a に要素 e が含まれていない場合にのみ、a に e を追加する。 */
function push_if_not_included(a, e) { if (! a.includes(e) ) { a.push(e); } }


/*** ラジオボタン関連 ***/

/* ラジオボタンで選択されている項目の value を返す。 */
function selected_radio_choice(radio_elt) {
  const L = radio_elt.length;
  for (let i = 0; i < L; i++) {
    if (radio_elt[i].checked) { return(radio_elt[i].value); }
  }
  return('');  // エラー避けに一応、最後につけておく。
}


/*** プルダウンリスト (セレクタ) の操作。 ***/

/* プルダウンリストで選択されている項目の value を返す。 */
function selected_choice(sel_elt) {
  return(sel_elt.options[sel_elt.selectedIndex].value);
}

/* プルダウンリストで、指定された値の選択肢を選択する。 */
function select_specified_option(sel_elt, val) {
  const L = sel_elt.options.length;
  for (let i = 0; i < L; i++) {
    if (sel_elt.options[i].value === val) { sel_elt.selectedIndex = i; return; }
  }
}

/* プルダウンリストに選択肢を追加して (ただし指定のものがなければ)、それを選択済み状態にする。 */
function add_selector_option(sel_elt, id, displayed_name) {
  // 指定された id を value 属性にもつ既存の選択肢をまず探す。
  const L = sel_elt.options.length;
  for (let i = 0; i < L; i++) {
    if (sel_elt.options[i].value === id) {
      // 念のため、id 属性と表示名は上書きする。
      sel_elt.options[i].id = id;
      sel_elt.options[i].textContent = displayed_name;
      // この既存の選択肢を選択しておく。
      sel_elt.selectedIndex = i;
      return;
    }
  }
  // ここに来るのは、既存の選択肢で合致するものがなかったとき。
  const opt = document.createElement('option');
  add_text_node(opt, displayed_name);  opt.value = id;  opt.id = id;
  sel_elt.appendChild(opt);  sel_elt.selectedIndex = sel_elt.options.length - 1;
}

/* プルダウンリストから選択肢を削除する */
function remove_choice(sel_elt, id) {
  let i;
  for (i = 0; i < sel_elt.options.length; i++) {
    // 数字を表す文字列が id として使われる場合があるので、=== でなく == を使う。
    if (sel_elt.options[i].value == id) { break; }
  }
  sel_elt.removeChild(sel_elt.options[i]);
  // 削除した選択肢の直後の選択肢を選択する (削除したのが最後のものだった場合は
  // 新たに最後になったもの (削除したものの直前のもの) を選択し、削除により何も
  // 選択肢がなくなった場合は何も選択しない)。
  sel_elt.selectedIndex = Math.min(i, sel_elt.options.length - 1);
}

/* プルダウンリストの選択肢の表示名を変更する。 */
function rename_choice(sel_elt, id, new_str) {
  for (let i = 0; i < sel_elt.options.length; i++) {
    if (sel_elt.options[i].value === id) {
      const opt = sel_elt.options[i];
      opt.removeChild(opt.firstChild); // テキストノードを削除
      add_text_node(opt, new_str);
      return;
    }
  }
}


/*** DOM 操作 ***/
/* SVG 要素または HTML 要素に文字列 t のテキストノードを追加 */
function add_text_node(elt, t) { elt.appendChild(document.createTextNode(t)); }

/* 子要素をすべて削除 (elt.innerHTML = '' としても良いが……) */
function remove_all_children(elt) {
  while (elt.firstChild) { elt.removeChild(elt.firstChild); }
}

/* [key, val] の対を要素とする配列 key_val_arr に基づき、DOM 要素 elt に属性を設定する */
function set_attributes(elt, key_val_arr) {
  key_val_arr.forEach(k_v => { elt.setAttribute(k_v[0], k_v[1]); });
}
