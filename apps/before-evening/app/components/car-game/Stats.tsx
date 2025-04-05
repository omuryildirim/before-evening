import React, { useEffect, useRef, useState } from 'react';
import { Stats } from '@before-evening/game-engine';

const Stats = ({ stats }: { stats: Stats }) => {
  const [mode, setMode] = useState(0);
  const fpsGraphRef = useRef<HTMLDivElement>(null);
  const msGraphRef = useRef<HTMLDivElement>(null);
  const fpsTextRef = useRef<HTMLDivElement>(null);
  const msTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateGraph = (dom: React.MutableRefObject<HTMLDivElement>, value: number) => {
      const child = dom.appendChild(dom.firstChild);
      child.style.height = value + 'px';
    };

    const updateStats = () => {
      const ms = stats.ms;
      const msMin = stats.msMin;
      const msMax = stats.msMax;
      const fps = stats.fps;
      const fpsMin = stats.fpsMin;
      const fpsMax = stats.fpsMax;

      if (msTextRef && msTextRef.current) {
        msTextRef.current.textContent = `${ms} MS (${msMin}-${msMax})`;
      }
      updateGraph(msGraphRef.current, Math.min(30, 30 - (ms / 200) * 30));

      if (fpsTextRef && fpsTextRef.current) {
        fpsTextRef.current.textContent = `${fps} FPS (${fpsMin}-${fpsMax})`;
      }
      updateGraph(fpsGraphRef.current, Math.min(30, 30 - (fps / 100) * 30));
    };

    const interval = setInterval(updateStats, 1000 / 60);

    return () => clearInterval(interval);
  }, [stats]);

  const handleModeChange = () => {
    setMode((prevMode) => (prevMode + 1) % 2);
  };

  return (
    <div id="stats" style={{ width: '80px', opacity: 0.9, cursor: 'pointer' }} onMouseDown={handleModeChange}>
      <div id="fps" style={{ display: mode === 0 ? 'block' : 'none', padding: '0 0 3px 3px', textAlign: 'left', backgroundColor: '#002' }}>
        <div id="fpsText" ref={fpsTextRef} style={{ color: '#0ff', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '9px', fontWeight: 'bold', lineHeight: '15px' }}>FPS</div>
        <div id="fpsGraph" ref={fpsGraphRef} style={{ position: 'relative', width: '74px', height: '30px', backgroundColor: '#0ff' }}>
          {Array.from({ length: 74 }).map((_, i) => (
            <span key={i} style={{ width: '1px', height: '30px', float: 'left', backgroundColor: '#113' }}></span>
          ))}
        </div>
      </div>
      <div id="ms" style={{ display: mode === 1 ? 'block' : 'none', padding: '0 0 3px 3px', textAlign: 'left', backgroundColor: '#020' }}>
        <div id="msText" ref={msTextRef} style={{ color: '#0f0', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '9px', fontWeight: 'bold', lineHeight: '15px' }}>MS</div>
        <div id="msGraph" ref={msGraphRef} style={{ position: 'relative', width: '74px', height: '30px', backgroundColor: '#0f0' }}>
          {Array.from({ length: 74 }).map((_, i) => (
            <span key={i} style={{ width: '1px', height: '30px', float: 'left', backgroundColor: '#131' }}></span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stats;
