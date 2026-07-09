# Angular integration

```bash
npm install velo-plot @angular/core
```

```ts
import { VeloPlotComponent, StackedPlotComponent } from 'velo-plot/angular';

@Component({
  standalone: true,
  imports: [VeloPlotComponent],
  template: `<velo-plot [series]="series" [height]="400" />`,
})
export class ChartPage {}
```

Service-style hooks: `useVeloPlotAngular`, `useStackedPlotAngular`, `useIndicatorAngular`, `useChartSyncAngular`.
