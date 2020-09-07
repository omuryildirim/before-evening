export const Dom = {
  get: function (id) {
    return ((id instanceof HTMLElement) || (id === document)) ? id : document.getElementById(id);
  },
  set: function (id, html) {
    Dom.get(id).innerHTML = html;
  },
  on: function (ele, type, fn, capture?) {
    Dom.get(ele).addEventListener(type, fn, capture);
  },
  un: function (ele, type, fn, capture) {
    Dom.get(ele).removeEventListener(type, fn, capture);
  },
  show: function (ele, type?) {
    Dom.get(ele).style.display = (type || 'block');
  },
  blur: function (ev) {
    ev.target.blur();
  },
  addClassName: function (ele, name) {
    Dom.toggleClassName(ele, name, true);
  },
  removeClassName: function (ele, name) {
    Dom.toggleClassName(ele, name, false);
  },
  toggleClassName: function (ele, name, on) {
    ele = Dom.get(ele);
    const classes = ele.className.split(' ');
    const n = classes.indexOf(name);
    on = (typeof on == 'undefined') ? (n < 0) : on;
    if (on && (n < 0))
      classes.push(name);
    else if (!on && (n >= 0))
      classes.splice(n, 1);
    ele.className = classes.join(' ');
  },
  storage: window.localStorage || {} as any
};
