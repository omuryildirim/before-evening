import React, { useState, useEffect } from 'react';
import { BeforeEveningGameEngine } from '@before-evening/game-engine';
import { useGameStateService } from '../GameStateService';
import Stats from './Stats';

const CarGameComponent = () => {
  const [beforeEvening, setBeforeEvening] = useState(null);
  const [currentState, setCurrentState] = useState(null);
  const [doNotRenderStats, _setDoNotRenderStats] = useState(true);
  const [skipRender, setSkipRender] = useState(false);
  const gameStateService = useGameStateService();

  useEffect(() => {
    const gameEngine = new BeforeEveningGameEngine();
    setBeforeEvening(gameEngine);
    gameStateService.beforeEvening = gameEngine;

    gameStateService.associateStateUpdater(gameEngine.stateUpdate);
    const width = document.querySelector('.left-side').clientWidth * 0.6;
    gameEngine.runGame({
      width: width.toString(),
      height: ((width * 3) / 4).toString(),
    });

    const stateSubscription = gameEngine.stateUpdate.subscribe((state) => {
      setCurrentState(state);
    });

    const refreshSubscription = gameStateService.refreshGame.subscribe(() => {
      gameEngine.resetGame();
    });

    return () => {
      stateSubscription.unsubscribe();
      refreshSubscription.unsubscribe();
    };
  }, [doNotRenderStats]);

  const toggleSkipRender = () => {
    if (beforeEvening) {
      beforeEvening.toggleSkipRender(skipRender);
      setSkipRender(!skipRender);
    }
  };

  return (
    <div>
      {!doNotRenderStats && (
        <table id="controls">
          <tbody>
          <tr>
            <td id="fps" colSpan="2" align="right"></td>
          </tr>
          <tr>
            <th><label htmlFor="resolution">Resolution :</label></th>
            <td>
              <select id="resolution" style={{ width: '100%' }}>
                <option value='fine'>Fine (1280x960)</option>
                <option value='high' selected>High (1024x768)</option>
                <option value='medium'>Medium (640x480)</option>
                <option value='low'>Low (480x360)</option>
              </select>
            </td>
          </tr>
          <tr>
            <th><label htmlFor="lanes">Lanes :</label></th>
            <td>
              <select id="lanes">
                <option>1</option>
                <option>2</option>
                <option selected>3</option>
                <option>4</option>
              </select>
            </td>
          </tr>
          <tr>
            <th><label htmlFor="roadWidth">Road Width (<span id="currentRoadWidth"></span>) :</label></th>
            <td><input id="roadWidth" type='range' min='500' max='3000' title="integer (500-3000)" /></td>
          </tr>
          <tr>
            <th><label htmlFor="cameraHeight">CameraHeight (<span id="currentCameraHeight"></span>) :</label></th>
            <td><input id="cameraHeight" type='range' min='500' max='5000' title="integer (500-5000)" /></td>
          </tr>
          <tr>
            <th><label htmlFor="drawDistance">Draw Distance (<span id="currentDrawDistance"></span>) :</label></th>
            <td><input id="drawDistance" type='range' min='100' max='500' title="integer (100-500)" /></td>
          </tr>
          <tr>
            <th><label htmlFor="fieldOfView">Field of View (<span id="currentFieldOfView"></span>) :</label></th>
            <td><input id="fieldOfView" type='range' min='80' max='140' title="integer (80-140)" /></td>
          </tr>
          <tr>
            <th><label htmlFor="fogDensity">Fog Density (<span id="currentFogDensity"></span>) :</label></th>
            <td><input id="fogDensity" type='range' min='0' max='50' title="integer (0-50)" /></td>
          </tr>
          </tbody>
        </table>
      )}

      <div id="racer">
        {beforeEvening && (
          <div id="hud">
            <span id="speed" className="hud"><span id="speed_value" className="value">{beforeEvening.stats.speed}</span> km/h</span>
            <span id="current_lap_time" className="hud">Time: <span id="current_lap_time_value" className="value">{beforeEvening.stats.currentLapTime}</span></span>
            {beforeEvening.stats.lastLapTime && (
              <span id="last_lap_time" className="hud">Last Lap: <span id="last_lap_time_value" className="value">{beforeEvening.stats.lastLapTime}</span></span>
            )}
            {beforeEvening.stats.bestLapTime && (
              <span id="fast_lap_time" className="hud">Fastest Lap: <span id="fast_lap_time_value" className="value">{beforeEvening.stats.bestLapTime}</span></span>
            )}
          </div>
        )}
        <canvas id="canvas">
          Sorry, this example cannot be run because your browser does not support the &lt;canvas&gt; element
        </canvas>
      </div>

      <audio id='music'>
        <source src="./music/racer.ogg" />
        <source src="./music/racer.mp3" />
      </audio>
      <span id="mute"></span>

      {currentState && !skipRender && !doNotRenderStats && (
        <div className="current-state">
          <div>{currentState.playerX}</div>
          <div>{currentState.next5Curve}</div>
          <div>{currentState.speed}</div>
        </div>
      )}

      {!doNotRenderStats && <Stats stats={beforeEvening.stats} />}
    </div>
  );
};

export default CarGameComponent;
