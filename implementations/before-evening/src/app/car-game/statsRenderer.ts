export class StatsRenderer {
  public domElement: HTMLDivElement;
  public fpsDiv: HTMLDivElement;
  public fpsText: HTMLDivElement;
  public fpsGraph: HTMLDivElement;
  public msDiv: HTMLDivElement;
  public msText: HTMLDivElement;
  public msGraph: HTMLDivElement;
  private mode: number;

  constructor(stats) {
    this.domElement = this.constructContainerElement();
    this.mode = 0;
    this.addStatsToView(stats);
  }

  private constructContainerElement() {
    const container = document.createElement('div');
    container.id = 'stats';
    container.addEventListener(
      'mousedown',
      (event) => {
        event.preventDefault();
        this.setMode(++this.mode % 2);
      },
      false
    );
    container.style.cssText = 'width:80px;opacity:0.9;cursor:pointer';

    this.fpsDiv = document.createElement('div');
    this.fpsDiv.id = 'fps';
    this.fpsDiv.style.cssText =
      'padding:0 0 3px 3px;text-align:left;background-color:#002';
    container.appendChild(this.fpsDiv);

    this.fpsText = document.createElement('div');
    this.fpsText.id = 'fpsText';
    this.fpsText.style.cssText =
      'color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
    this.fpsText.innerHTML = 'FPS';
    this.fpsDiv.appendChild(this.fpsText);

    this.fpsGraph = document.createElement('div');
    this.fpsGraph.id = 'fpsGraph';
    this.fpsGraph.style.cssText =
      'position:relative;width:74px;height:30px;background-color:#0ff';
    this.fpsDiv.appendChild(this.fpsGraph);

    while (this.fpsGraph.children.length < 74) {
      const bar = document.createElement('span');
      bar.style.cssText =
        'width:1px;height:30px;float:left;background-color:#113';
      this.fpsGraph.appendChild(bar);
    }

    this.msDiv = document.createElement('div');
    this.msDiv.id = 'ms';
    this.msDiv.style.cssText =
      'padding:0 0 3px 3px;text-align:left;background-color:#020;display:none';
    container.appendChild(this.msDiv);

    this.msText = document.createElement('div');
    this.msText.id = 'msText';
    this.msText.style.cssText =
      'color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
    this.msText.innerHTML = 'MS';
    this.msDiv.appendChild(this.msText);

    this.msGraph = document.createElement('div');
    this.msGraph.id = 'msGraph';
    this.msGraph.style.cssText =
      'position:relative;width:74px;height:30px;background-color:#0f0';
    this.msDiv.appendChild(this.msGraph);

    while (this.msGraph.children.length < 74) {
      const bar = document.createElement('span');
      bar.style.cssText =
        'width:1px;height:30px;float:left;background-color:#131';
      this.msGraph.appendChild(bar);
    }

    return container;
  }

  public setMode(value) {
    this.mode = value;

    switch (this.mode) {
      case 0:
        this.fpsDiv.style.display = 'block';
        this.msDiv.style.display = 'none';
        break;
      case 1:
        this.fpsDiv.style.display = 'none';
        this.msDiv.style.display = 'block';
        break;
    }
  }

  public updateGraph(dom, value) {
    const child = dom.appendChild(dom.firstChild);
    child.style.height = value + 'px';
  }

  public updateStats(
    ms: number,
    msMin: number,
    msMax: number,
    fps: number,
    fpsMin: number,
    fpsMax: number
  ) {
    this.msText.textContent = ms + ' MS (' + msMin + '-' + msMax + ')';
    this.updateGraph(this.msGraph, Math.min(30, 30 - (ms / 200) * 30));

    this.fpsText.textContent = fps + ' FPS (' + fpsMin + '-' + fpsMax + ')';
    this.updateGraph(this.fpsGraph, Math.min(30, 30 - (fps / 100) * 30));
  }

  private addStatsToView(stats, parentId = 'fps') {
    this.domElement.id = 'stats';
    document.getElementById(parentId).appendChild(this.domElement);

    const msg = document.createElement('div');
    msg.style.cssText =
      'border: 2px solid gray; padding: 5px; margin-top: 5px; text-align: left; font-size: 1.15em; text-align: right;';
    msg.innerHTML = 'Your canvas performance is ';
    document.getElementById(parentId).appendChild(msg);

    const value = document.createElement('span');
    value.innerHTML = '...';
    msg.appendChild(value);

    setInterval(() => {
      const fps = stats.current();
      const ok = fps > 50 ? 'good' : fps < 30 ? 'bad' : 'ok';
      const color = fps > 50 ? 'green' : fps < 30 ? 'red' : 'gray';
      value.innerHTML = ok;
      value.style.color = color;
      msg.style.borderColor = color;
    }, 5000);
  }
}
