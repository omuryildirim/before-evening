import {Stats} from "../lib/stats";

export const Game = {  // a modified version of the game loop from my previous boulderdash game - see http://codeincomplete.com/posts/2011/10/25/javascript_boulderdash/#gameloop
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
      result[n].addEventListener('load', onload);
      result[n].src = "images/" + name + ".png";
    }
  },

  //---------------------------------------------------------------------------

  stats: function (parentId, id?) { // construct mr.doobs FPS counter - along with friendly good/bad/ok message box
    return null;
    const result = new Stats();
    result.domElement.id = id || 'stats';
    document.getElementById(parentId).appendChild(result.domElement);

    const msg = document.createElement('div');
    msg.style.cssText = "border: 2px solid gray; padding: 5px; margin-top: 5px; text-align: left; font-size: 1.15em; text-align: right;";
    msg.innerHTML = "Your canvas performance is ";
    document.getElementById(parentId).appendChild(msg);

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
    const music = document.getElementById('music') as HTMLAudioElement;
    music.loop = true;
    music.volume = 0.05; // shhhh! annoying music!
    music.muted = true;
    music.play();
    document.getElementById('mute').addEventListener('click', () => {
      music.muted = !music.muted;
    });
  }
};
