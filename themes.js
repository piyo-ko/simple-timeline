'use strict';

const COLOR_THEMES = [
/*
  { id: '',
    name: { ja: '/', en: '/' },
    bar_color: 'hsl(, %, %)',
    bar_fading_end_opacity: 0.,
    bar_body_opacity: 0.,
    circle_fill: 'hsla(, %, %, 0.)',
    circle_stroke: 'hsla(, %, %, 0.)',
    text_fill: 'hsl(, %, %)'
  },
*/
  { id: 'grey_red',
    name: { ja: '薄墨/赤', en: 'grey/red' },
    bar_color: 'hsl(0, 0%, 80%)',
    bar_fading_end_opacity: 0.1,
    bar_body_opacity: 0.8,
    circle_fill: 'hsla(0, 100%, 65%, 0.3)',
    circle_stroke: 'hsla(0, 100%, 65%, 0.9)',
    text_fill: 'hsl(0, 90%, 30%)'
  },
  { id: 'grey_green',
    name: { ja: '薄墨/緑', en: 'grey/green' },
    bar_color: 'hsl(120, 0%, 80%)',
    bar_fading_end_opacity: 0.1,
    bar_body_opacity: 0.8,
    circle_fill: 'hsla(120, 100%, 65%, 0.3)',
    circle_stroke: 'hsla(120, 100%, 35%, 0.9)',
    text_fill: 'hsl(120, 90%, 30%)'
  },
  { id: 'grey_blue',
    name: { ja: '薄墨/青', en: 'grey/blue' },
    bar_color: 'hsl(240, 0%, 80%)',
    bar_fading_end_opacity: 0.1,
    bar_body_opacity: 0.8,
    circle_fill: 'hsla(240, 100%, 65%, 0.3)',
    circle_stroke: 'hsla(240, 100%, 65%, 0.9)',
    text_fill: 'hsl(240, 90%, 30%)'
  },
  { id: 'yellow_orange',
    name: { ja: '薄黄色/橙色', en: 'light yellow/orange' },
    bar_color: 'hsl(60, 80%, 80%)',
    bar_fading_end_opacity: 0.2,
    bar_body_opacity: 0.9,
    circle_fill: 'hsla(20, 100%, 65%, 0.3)',
    circle_stroke: 'hsla(20, 100%, 50%, 0.8)',
    text_fill: 'hsl(20, 100%, 30%)'
  },
  { id: 'yellow_blue',
    name: { ja: '薄黄色/水色', en: 'light yellow/light blue' },
    bar_color: 'hsl(60, 80%, 80%)',
    bar_fading_end_opacity: 0.2,
    bar_body_opacity: 0.9,
    circle_fill: 'hsla(170, 100%, 70%, 0.3)',
    circle_stroke: 'hsla(170, 100%, 30%, 0.8)',
    text_fill: 'hsl(170, 50%, 30%)'
  },
  { id: 'orange_green',
    name: { ja: '橙色/緑', en: 'orange/green' },
    bar_color: 'hsl(20, 100%, 65%)',
    bar_fading_end_opacity: 0.1,
    bar_body_opacity: 0.5,
    circle_fill: 'hsla(120, 100%, 65%, 0.3)',
    circle_stroke: 'hsla(120, 100%, 35%, 0.9)',
    text_fill: 'hsl(20, 90%, 30%)'
  },
  { id: 'pink_blue',
    name: { ja: '薄桃色/水色', en: 'pink/light blue' },
    bar_color: 'hsl(310, 90%, 75%)',
    bar_fading_end_opacity: 0.1,
    bar_body_opacity: 0.5,
    circle_fill: 'hsla(170, 100%, 70%, 0.3)',
    circle_stroke: 'hsla(170, 100%, 30%, 0.8)',
    text_fill: 'hsl(310, 70%, 30%)'
  },
  { id: 'purple_grey',
    name: { ja: '藤色/薄墨', en: 'purple/grey' },
    bar_color: 'hsl(255, 80%, 70%)',
    bar_fading_end_opacity: 0.1,
    bar_body_opacity: 0.5,
    circle_fill: 'hsla(255, 0%, 80%, 0.6)',
    circle_stroke: 'hsla(255, 0%, 50%, 0.9)',
    text_fill: 'hsl(255, 30%, 40%)'
  },
  { id: 'cyan_blue',
    name: { ja: '水色/薄青', en: 'cyan/blue' },
    bar_color: 'hsl(180, 100%, 70%)',
    bar_fading_end_opacity: 0.2,
    bar_body_opacity: 0.5,
    circle_fill: 'hsla(245, 90%, 60%, 0.3)',
    circle_stroke: 'hsla(245, 90%, 60%, 0.8)',
    text_fill: 'hsl(245, 80%, 30%)'
  },
  { id: 'cyan_pink',
    name: { ja: '水色/桃色', en: 'cyan/pink' },
    bar_color: 'hsl(180, 100%, 70%)',
    bar_fading_end_opacity: 0.2,
    bar_body_opacity: 0.5,
    circle_fill: 'hsla(310, 90%, 60%, 0.3)',
    circle_stroke: 'hsla(310, 90%, 60%, 0.8)',
    text_fill: 'hsl(310, 80%, 30%)'
  },
  { id: 'green_blue',
    name: { ja: '緑色/薄青', en: 'green/blue' },
    bar_color: 'hsl(125, 90%, 70%)',
    bar_fading_end_opacity: 0.1,
    bar_body_opacity: 0.6,
    circle_fill: 'hsla(245, 90%, 60%, 0.3)',
    circle_stroke: 'hsla(245, 90%, 60%, 0.8)',
    text_fill: 'hsl(245, 80%, 30%)'
  }
];

const ARROW_COLORS = [
/*
  { id: '',
    name: {ja: '', en: '' },
    arrow_color: 'hsl(, %, %)'
  },
*/
  { id: 'dark_gray',
    name: {ja: '濃灰色', en: 'dark gray' },
    arrow_color: 'hsl(0, 0%, 25%)'
  },
  { id: 'dark_red',
    name: {ja: '暗赤色', en: 'dark red' },
    arrow_color: 'hsl(340, 75%, 30%)'
  },
  { id: 'dark_blue',
    name: {ja: '紺色', en: 'dark blue' },
    arrow_color: 'hsl(220, 50%, 30%)'
  },
  { id: 'dark_green',
    name: {ja: '深緑', en: 'dark green' },
    arrow_color: 'hsl(100, 40%, 25%)'
  }
];
