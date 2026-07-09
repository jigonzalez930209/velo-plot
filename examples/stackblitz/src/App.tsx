import { VeloPlot } from 'velo-plot/react';

const n = 100;
const x = new Float32Array(n);
const y = new Float32Array(n);
for (let i = 0; i < n; i++) {
  x[i] = i * 0.1;
  y[i] = Math.sin(x[i]);
}

export function App() {
  return (
    <VeloPlot
      series={[{ id: 'demo', x, y, color: '#00f2ff' }]}
      height={400}
      theme="midnight"
      xAxis={{ label: 'X' }}
      yAxis={{ label: 'Y' }}
    />
  );
}
