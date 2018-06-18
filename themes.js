'use strict';

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
  },
  { id: 'green_blue',
    name: { ja: '緑色/薄青', en: 'green/blue' },
    bar_color: 'hsl(125, 90%, 70%)',
    bar_fading_end_opacity: 0.1,
    bar_body_opacity: 0.6,
    circle_fill: 'hsla(245, 90%, 60%, 0.3)',
    circle_stroke: 'hsla(245, 90%, 60%, 0.8)',
    text_fill: 'hsl(245, 80%, 30%)'
  },
  { id: 'yellow_orange',
    name: { ja: '薄黄色/橙色', en: 'light yellow/orange' },
    bar_color: 'hsl(60, 80%, 80%)',
    bar_fading_end_opacity: 0.2,
    bar_body_opacity: 0.9,
    circle_fill: 'hsla(20, 100%, 65%, 0.3)',
    circle_stroke: 'hsla(20, 100%, 50%, 0.8)',
    text_fill: 'hsl(20, 100%, 30%)'
  }
];
