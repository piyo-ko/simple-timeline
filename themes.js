'use strict';

/* In this file, color themes are defined. */

const COLOR_THEMES = [
  { id: 'yellow_blue',
    name: { ja: '薄黄色/水色', en: 'light yellow/light blue' },
    bar_color: 'hsl(60, 80%, 80%)',
    bar_fading_end_opacity: 0.2,
    bar_body_opacity: 0.9,
    circle_fill: 'hsla(170, 100%, 70%, 0.3)',
    circle_stroke: 'hsla(170, 100%, 30%, 0.8)',
    text_fill: 'hsl(170, 50%, 30%)'
  },
  { id: 'pink_blue',
    name: { ja: '薄桃色/水色', en: 'pink/light blue' },
    bar_color: 'hsl(310, 90%, 75%)',
    bar_fading_end_opacity: 0.1,
    bar_body_opacity: 0.6,
    circle_fill: 'hsla(170, 100%, 70%, 0.3)',
    circle_stroke: 'hsla(170, 100%, 30%, 0.8)',
    text_fill: 'hsl(310, 70%, 30%)'
  }
];

/* The reason of why the themes are defined in this way is as follows.

(1) An CSS file in which the "fill" attribute is specified in a way such as
    fill: linear-gradient(to right, white, yellow)
has browser-dependency.  Thus, such an CSS file should be avoided and I have 
decided to use <linearGradient> elements of SVG instead.
(2) A combination of an external SVG file (including the definitions of 
<linearGradient> elements) and the reference to the file also has browser-
dependency.  Thus, the definitions should be included within the same <svg> element 
that includes rectangles, circles, etc.
(3) It is desirable to allow the number of color themes to be arbitrarily 
increased.  In addition, it is also desirable to manage the color themes in a file 
separate from the HTML file, which includes the <svg> element.
(4) Taking the constraints (1), (2), and (3) into consideration, I have adopted 
the way of
  (i) statically defining each theme as an JavaScript Object beforehand (as in this
  file), 
  (ii) dynamically generating CSS rules and adding them into the <style> element 
       within the <svg> element, 
  (iii) dynamically generating <linearGradient> elements and adding them into
       the <svg> element.
*/

/* 
(1) fill 属性に linear-gradient(to right, white, yellow) のように指定した CSS を
使うと、ブラウザによっては望みどおりに表示されない。
そのため、SVG の linearGradient 要素を使うことにする。
(2) また、ブラウザによっては、外部の SVG ファイル (linearGradient 要素の定義を
含むもの) を参照しても、望みどおりの表示にならない。
そのため、矩形や円などを描画している svg 要素自体の内部に linearGradient 要素を
含めることにする。
(3) 配色テーマは、任意に個数を増やせるようにしたいし、HTML ファイルとは独立した
ファイルで定義したい。
(4) 以上の条件を満たすために、上記のように JavaScript のオブジェクトの形で個々の
テーマを定義しておいて、style 要素内の規則と linearGradient 要素を動的に追加する
ことにした。
 */
