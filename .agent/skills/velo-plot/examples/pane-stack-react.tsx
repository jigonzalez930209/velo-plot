/**
 * React multi-pane stack with useStackedPlot
 */
import { useEffect } from 'react';
import { useStackedPlot } from 'velo-plot/react';

function generateDemoData(n: number) {
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const t0 = Date.UTC(2024, 0, 1);
  for (let i = 0; i < n; i++) {
    x[i] = t0 + i * 86_400_000;
    y[i] = 100 + Math.sin(i / 8) * 10 + (Math.random() - 0.5) * 2;
  }
  return { x, y };
}

export function PaneStackExample() {
  const data = generateDemoData(80);

  const { containerRef, isReady, fitAll } = useStackedPlot({
    masterPaneId: 'main',
    sharedXAxis: 'bottom',
    theme: 'midnight',
    panes: [
      {
        id: 'main',
        height: 0.65,
        interactive: true,
        chart: {
          xAxis: { type: 'time' },
          yAxis: { label: 'Price' },
          loading: false,
        },
        series: [{
          id: 'line',
          type: 'line',
          data: { x: data.x, y: data.y },
          style: { color: '#00f2ff', width: 1.5 },
        }],
      },
      {
        id: 'osc',
        height: 0.35,
        chart: { yAxis: { label: 'Oscillator' } },
        series: [{
          id: 'osc-line',
          type: 'line',
          data: {
            x: data.x,
            y: data.y.map((v) => v - 100),
          },
          style: { color: '#ff6b6b', width: 1 },
        }],
      },
    ],
  });

  useEffect(() => {
    if (isReady) fitAll();
  }, [isReady, fitAll]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: 400, borderRadius: 8 }}
    />
  );
}
