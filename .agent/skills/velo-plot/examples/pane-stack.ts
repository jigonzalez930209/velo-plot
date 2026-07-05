/**
 * Multi-pane stack example — Price / Volume / RSI
 *
 * Run in browser after building velo-plot, or adapt for your app bundler.
 */
import { createStackedChart } from 'velo-plot';

function generateDemoData(n: number) {
  const x = new Float32Array(n);
  const open = new Float32Array(n);
  const high = new Float32Array(n);
  const low = new Float32Array(n);
  const close = new Float32Array(n);
  const volume = new Float32Array(n);
  const rsi = new Float32Array(n);

  const t0 = Date.UTC(2024, 0, 1);
  let price = 100;

  for (let i = 0; i < n; i++) {
    x[i] = t0 + i * 86_400_000;
    open[i] = price;
    const ch = (Math.random() - 0.48) * 3;
    close[i] = price + ch;
    high[i] = Math.max(open[i], close[i]) + Math.random() * 2;
    low[i] = Math.min(open[i], close[i]) - Math.random() * 2;
    volume[i] = 1e6 * (0.5 + Math.random());
    price = close[i];
  }

  for (let i = 14; i < n; i++) {
    let g = 0, l = 0;
    for (let j = i - 13; j <= i; j++) {
      const d = close[j] - close[j - 1];
      if (d >= 0) g += d; else l -= d;
    }
    rsi[i] = 100 - 100 / (1 + (l === 0 ? 100 : g / l));
  }

  return { x, open, high, low, close, volume, rsi };
}

export async function mountPaneStack(container: HTMLDivElement) {
  const d = generateDemoData(100);

  const stack = createStackedChart({
    container,
    masterPaneId: 'price',
    sharedXAxis: 'bottom',
    theme: 'midnight',
    devicePixelRatio: window.devicePixelRatio,
    panes: [
      {
        id: 'price',
        height: 0.55,
        interactive: true,
        chart: {
          xAxis: { type: 'time', label: 'Date' },
          yAxis: { label: 'Price', scientific: false },
          loading: false,
        },
        series: [{
          id: 'ohlc',
          type: 'candlestick',
          data: { x: d.x, open: d.open, high: d.high, low: d.low, close: d.close },
          style: { bullishColor: '#26a69a', bearishColor: '#ef5350' },
        }],
      },
      {
        id: 'volume',
        height: 0.22,
        chart: { yAxis: { label: 'Volume', prefix: 'M', scientific: false } },
        series: [{
          id: 'vol',
          type: 'bar',
          data: { x: d.x, y: d.volume },
          style: { color: 'rgba(100, 181, 246, 0.75)' },
        }],
      },
      {
        id: 'rsi',
        height: 0.23,
        yRange: [0, 100],
        chart: { yAxis: { label: 'RSI', auto: false, min: 0, max: 100 } },
        series: [{
          id: 'rsi',
          type: 'line',
          data: { x: d.x, y: d.rsi },
          style: { color: '#ab47bc', width: 1.5 },
        }],
      },
    ],
  });

  await stack.whenReady();
  stack.fitAll();

  return stack;
}

// Usage:
// const el = document.getElementById('chart') as HTMLDivElement;
// el.style.height = '480px';
// const stack = await mountPaneStack(el);
// stack.destroy(); // on unmount
