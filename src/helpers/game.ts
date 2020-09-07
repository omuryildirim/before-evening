import {Stats} from "../lib/stats";
import {Utils} from "../lib/utils";

import {Dom} from "./dom";

export const Game = {  // a modified version of the game loop from my previous boulderdash game - see http://codeincomplete.com/posts/2011/10/25/javascript_boulderdash/#gameloop
  run: function (options) {
    Game.loadImages(options.images, function (images) {

      options.ready(images); // tell caller to initialize itself because images are loaded and we're ready to rumble

      Game.setKeyListener(options.keys);

      // const canvas = options.canvas,    // canvas render target is provided by caller
      const  update = options.update,    // method to update game logic is provided by caller
        render = options.render,    // method to render the game is provided by caller
        step = options.step,      // fixed frame step (1/fps) is specified by caller
        stats = options.stats;     // stats instance is provided by caller

      let now = null,
        last = Utils.timestamp(),
        dt = 0,
        gdt = 0;

      function frame() {
        now = Utils.timestamp();
        dt = Math.min(1, (now - last) / 1000); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab
        gdt = gdt + dt;
        while (gdt > step) {
          gdt = gdt - step;
          update(step);
        }
        render();
        stats.update();
        last = now;
        requestAnimationFrame(frame); // requestAnimationFrame(frame, canvas);
      }

      frame(); // lets get this party started
      Game.playMusic();
    });
  },

  //---------------------------------------------------------------------------

  loadImages: function (names, callback) { // load multiple images and callback when ALL images have loaded
    const result = [];
    let count = names.length;

    const onload = function () {
      if (--count == 0)
        callback(result);
    };

    for (let n = 0; n < names.length; n++) {
      const name = names[n];
      result[n] = document.createElement('img');
      Dom.on(result[n], 'load', onload);
      result[n].src = "images/" + name + ".png";
    }
  },

  //---------------------------------------------------------------------------

  setKeyListener: function (keys) {
    const onkey = function (keyCode, mode) {
      let n, k;
      for (n = 0; n < keys.length; n++) {
        k = keys[n];
        k.mode = k.mode || 'up';
        if ((k.key == keyCode) || (k.keys && (k.keys.indexOf(keyCode) >= 0))) {
          if (k.mode == mode) {
            k.action.call();
          }
        }
      }
    };
    Dom.on(document, 'keydown', function (ev) {
      onkey(ev.keyCode, 'down');
    });
    Dom.on(document, 'keyup', function (ev) {
      onkey(ev.keyCode, 'up');
    });
  },

  //---------------------------------------------------------------------------

  stats: function (parentId, id?) { // construct mr.doobs FPS counter - along with friendly good/bad/ok message box

    const result = new Stats();
    result.domElement.id = id || 'stats';
    Dom.get(parentId).appendChild(result.domElement);

    const msg = document.createElement('div');
    msg.style.cssText = "border: 2px solid gray; padding: 5px; margin-top: 5px; text-align: left; font-size: 1.15em; text-align: right;";
    msg.innerHTML = "Your canvas performance is ";
    Dom.get(parentId).appendChild(msg);

    const value = document.createElement('span');
    value.innerHTML = "...";
    msg.appendChild(value);

    setInterval(function () {
      const fps = result.current();
      const ok = (fps > 50) ? 'good' : (fps < 30) ? 'bad' : 'ok';
      const color = (fps > 50) ? 'green' : (fps < 30) ? 'red' : 'gray';
      value.innerHTML = ok;
      value.style.color = color;
      msg.style.borderColor = color;
    }, 5000);
    return result;
  },

  //---------------------------------------------------------------------------

  playMusic: function () {
    const music = Dom.get('music');
    music.loop = true;
    music.volume = 0.05; // shhhh! annoying music!
    music.muted = (Dom.storage.muted === "true");
    music.play();
    Dom.toggleClassName('mute', 'on', music.muted);
    Dom.on('mute', 'click', function () {
      Dom.storage.muted = music.muted = !music.muted;
      Dom.toggleClassName('mute', 'on', music.muted);
    });
  }
};
