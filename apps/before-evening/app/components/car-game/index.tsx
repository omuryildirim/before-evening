import React, { useState, useEffect } from 'react';
import GameStateService from '~/components/GameStateService';
import Stats from './Stats';
import { StateUpdate } from '@before-evening/game-engine';

interface Params {
  gameStateService: GameStateService;
  leftSideRef: React.RefObject<HTMLDivElement>;
}

const CarGameComponent = ({ gameStateService, leftSideRef }: Params) => {
  const [currentState, setCurrentState] = useState<StateUpdate | undefined>();
  const [doNotRenderStats, _setDoNotRenderStats] = useState(true);
  const [skipRender, setSkipRender] = useState(false);

  useEffect(() => {
    const stateUpdaterIndex = gameStateService.addStateUpdater((state: StateUpdate) => gameStateService.beforeEvening.stateUpdate.next(state));
    const width = (leftSideRef.current?.clientWidth || 0) * 0.6;
    gameStateService.beforeEvening.runGame({
      width: width.toString(),
      height: ((width * 3) / 4).toString(),
    });

    const stateSubscription = gameStateService.beforeEvening.stateUpdate.subscribe((state) => {
      setCurrentState(state);
      // gameStateService.updateState(state);
    });

    const refreshGameUpdaterIndex = gameStateService.addRefreshGameUpdater(() => {
      gameStateService.beforeEvening.resetGame();
    });

    return () => {
      stateSubscription.unsubscribe();
      gameStateService.removeRefreshGameUpdater(refreshGameUpdaterIndex);
      gameStateService.removeStateUpdater(stateUpdaterIndex);
    };
  }, [doNotRenderStats]);

  const toggleSkipRender = () => {
    if (gameStateService.beforeEvening) {
      gameStateService.beforeEvening.toggleSkipRender(skipRender);
      setSkipRender(!skipRender);
    }
  };

  return (
    <div className="car-game-container">
      {!doNotRenderStats && (
        <table id="controls">
          <tbody>
          <tr>
            <td id="fps" colSpan={2} align="right"></td>
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
        {gameStateService.beforeEvening && (
          <div id="hud">
            <span id="speed" className="hud"><span id="speed_value" className="value">{gameStateService.beforeEvening.stats.speed}</span> km/h</span>
            <span id="current_lap_time" className="hud">Time: <span id="current_lap_time_value" className="value">{gameStateService.beforeEvening.stats.currentLapTime}</span></span>
            {gameStateService.beforeEvening.stats.lastLapTime && (
              <span id="last_lap_time" className="hud">Last Lap: <span id="last_lap_time_value" className="value">{gameStateService.beforeEvening.stats.lastLapTime}</span></span>
            )}
            {gameStateService.beforeEvening.stats.bestLapTime && (
              <span id="fast_lap_time" className="hud">Fastest Lap: <span id="fast_lap_time_value" className="value">{gameStateService.beforeEvening.stats.bestLapTime}</span></span>
            )}
          </div>
        )}
        <canvas id="canvas">
          Sorry, this example cannot be run because your browser does not support the &lt;canvas&gt; element
        </canvas>
      </div>

      {currentState && !skipRender && !doNotRenderStats && (
        <div className="current-state">
          <div>{currentState.playerX}</div>
          <div>{currentState.next5Curve}</div>
          <div>{currentState.speed}</div>
        </div>
      )}

      {!doNotRenderStats && <Stats stats={gameStateService.beforeEvening.stats} />}
    </div>
  );
};

export default CarGameComponent;
