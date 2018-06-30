# SVG で年表づくり
# Drawing a timeline chart in SVG format

ブラウザ上で SVG 形式の簡単な年表を作成できます。好きな配色テーマを定義したいときは、`themes.js` を編集してください。クライアントサイドスクリプトのみで動作します。

A simple timeline chart in SVG format can be created on your browser.  If you would like to define a color theme, please edit `themes.js` as you like.  This app uses client-side scripts only.

---

## 備忘録: なぜ CSS 規則ではなく JavaScript オブジェクトとして配色テーマを定義しているのか?

1. `fill` 属性に 
````
linear-gradient(to right, white, yellow)
````
のように指定した CSS を使うと、ブラウザによっては望みどおりに表示されない。そのため、SVG の `<linearGradient>` 要素を使うことにする。

2. また、ブラウザによっては、外部の SVG ファイル (`<linearGradient>` 要素の定義を含むもの) を参照しても、望みどおりの表示にならない。
そのため、矩形や円などを描画している `<svg>` 要素自体の内部に `<linearGradient>` 要素を含めることにする。

3. しかしその一方で、配色テーマは、任意に個数を増やせるようにしたいし、HTML ファイル (`timeline_maker.html`) とは独立したファイルで定義したい。

4. 以上の条件を満たすために、上記のように JavaScript のオブジェクトの形で個々のテーマを定義しておいて、`<style>` 要素内の規則と `<linearGradient>` 要素とを動的に追加することにした。

---

## Memo: Why is each color theme defined as a JavaScript Object, not a set of rules of CSS?

1. A CSS file in which the `fill` attribute is specified in a way such as
````
fill: linear-gradient(to right, white, yellow)
````
has browser-dependency.  Thus, such a CSS file should be avoided and I have decided to use `<linearGradient>` elements of SVG instead.

2. A combination of an external SVG file (including the definitions of `<linearGradient>` elements) and the reference to that file also has browser-dependency.  Thus, the definitions should be included within the same `<svg>` element that includes rectangles, circles, etc.

3.  It is desirable to allow the number of color themes to be arbitrarily increased.  In addition, it is also desirable to manage the color themes in a file separate from the HTML file (`timeline_maker.html`), which includes the `<svg>` element.

4. Taking constraints (1), (2), and (3) into consideration, I have adopted 
the way of:
  * statically defining each theme as a JavaScript Object beforehand (as in `themes.js`); 
  * dynamically generating CSS rules and adding them into the `<style>` element within the `<svg>` element; and
  * dynamically generating `<linearGradient>` elements and adding them into the `<svg>` element.

