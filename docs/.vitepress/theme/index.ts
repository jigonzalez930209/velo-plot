import DefaultTheme from 'vitepress/theme'
import ChartDemo from './ChartDemo.vue'
import ChartDemo3D from './ChartDemo3D.vue'
import TenMillionPoints from './TenMillionPoints.vue'
// Standalone Chart Components
import SineWavesChart from './components/charts/SineWavesChart.vue'
import SquareWavesChart from './components/charts/SquareWavesChart.vue'
import TriangleWavesChart from './components/charts/TriangleWavesChart.vue'
import AnalysisAdvancedChart from './components/charts/AnalysisAdvancedChart.vue'
import ComplexFFTDemo from './components/charts/ComplexFFTDemo.vue'
import SingleFreqFilterDemo from './demos/2d/SingleFreqFilterDemo.vue'
import RegressionDemo from './demos/RegressionDemo.vue'
import RadarDemo from './demos/RadarDemo.vue'
import MLIntegrationDemo from './demos/MLIntegrationDemo.vue'
import ProcessMonitoringDemo from './demos/2d/ProcessMonitoringDemo.vue'
import ScientificDemo from './demos/ScientificDemo.vue'
import WaterfallDemo from './demos/WaterfallDemo.vue'
import LaTeXDemo from './demos/LaTeXDemo.vue'
import TernaryDemo from './demos/TernaryDemo.vue'
import DragEditDemo from './demos/DragEditDemo.vue'
import CachingDemo from "./demos/CachingDemo.vue";
import LazyLoadDemo from "./demos/LazyLoadDemo.vue";
import BrokenAxisDemo from "./demos/BrokenAxisDemo.vue";
import VirtualizationDemo from "./demos/VirtualizationDemo.vue";
import SnapshotDemo from "./demos/SnapshotDemo.vue";
import DataExportDemo from "./demos/DataExportDemo.vue";
import VideoRecorderDemo from "./demos/VideoRecorderDemo.vue";
import RoiDemo from "./demos/RoiDemo.vue";
import OffscreenDemo from "./demos/OffscreenDemo.vue";
import ForecastingDemo from "./demos/ForecastingDemo.vue";
import InvertedAxisDemo from "./demos/InvertedAxisDemo.vue";
import PaneStackDemo from "./demos/PaneStackDemo.vue";
import TradingDashboardDemo from "./demos/trading/TradingDashboardDemo.vue";
import TradingSessionDemo from "./demos/trading/TradingSessionDemo.vue";
import TradingIndicatorsDemo from "./demos/trading/TradingIndicatorsDemo.vue";
import TradingDrawingToolsDemo from "./demos/trading/TradingDrawingToolsDemo.vue";
import TradingHeikinAshiDemo from "./demos/trading/TradingHeikinAshiDemo.vue";
import TradingHollowCandlesDemo from "./demos/trading/TradingHollowCandlesDemo.vue";
import TradingMarkersPositionsDemo from "./demos/trading/TradingMarkersPositionsDemo.vue";
import TradingAlertsDemo from "./demos/trading/TradingAlertsDemo.vue";
import TradingReplayDemo from "./demos/trading/TradingReplayDemo.vue";
import TradingDatafeedDemo from "./demos/trading/TradingDatafeedDemo.vue";
// import ContextMenu from "./components/ContextMenu.vue";
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: any }) {
    app.component('ChartDemo', ChartDemo)
    app.component('ChartDemo3D', ChartDemo3D)
    app.component('TenMillionPoints', TenMillionPoints)
    // Standalone chart components - can be used directly without ChartDemo wrapper
    app.component('SineWavesChart', SineWavesChart)
    app.component('SquareWavesChart', SquareWavesChart)
    app.component('TriangleWavesChart', TriangleWavesChart)
    app.component('AnalysisAdvancedChart', AnalysisAdvancedChart)
    app.component('ComplexFFTDemo', ComplexFFTDemo)
    app.component('SingleFreqFilterDemo', SingleFreqFilterDemo)
    app.component('RegressionDemo', RegressionDemo)
    app.component('RadarDemo', RadarDemo)
    app.component('MLIntegrationDemo', MLIntegrationDemo)
    // app.component('SnapshotDemo', SnapshotDemo) // This was already commented in the original, keeping it as is.
    app.component('ProcessMonitoringDemo', ProcessMonitoringDemo)
    app.component('ScientificDemo', ScientificDemo)
    app.component('WaterfallDemo', WaterfallDemo)
    app.component('LaTeXDemo', LaTeXDemo)
    app.component('TernaryDemo', TernaryDemo)
    app.component('DragEditDemo', DragEditDemo)
    app.component('CachingDemo', CachingDemo)
    app.component('LazyLoadDemo', LazyLoadDemo)
    app.component('SnapshotDemo', SnapshotDemo)
    app.component('DataExportDemo', DataExportDemo)
    app.component('VideoRecorderDemo', VideoRecorderDemo)
    app.component('RoiDemo', RoiDemo)
    app.component('OffscreenDemo', OffscreenDemo)
    app.component('BrokenAxisDemo', BrokenAxisDemo)
    app.component('VirtualizationDemo', VirtualizationDemo)
    app.component('ForecastingDemo', ForecastingDemo)
    app.component('InvertedAxisDemo', InvertedAxisDemo)
    app.component('PaneStackDemo', PaneStackDemo)
    app.component('TradingDashboardDemo', TradingDashboardDemo)
    app.component('TradingSessionDemo', TradingSessionDemo)
    app.component('TradingIndicatorsDemo', TradingIndicatorsDemo)
    app.component('TradingDrawingToolsDemo', TradingDrawingToolsDemo)
    app.component('TradingHeikinAshiDemo', TradingHeikinAshiDemo)
    app.component('TradingHollowCandlesDemo', TradingHollowCandlesDemo)
    app.component('TradingMarkersPositionsDemo', TradingMarkersPositionsDemo)
    app.component('TradingAlertsDemo', TradingAlertsDemo)
    app.component('TradingReplayDemo', TradingReplayDemo)
    app.component('TradingDatafeedDemo', TradingDatafeedDemo)
    // app.component('ContextMenu', ContextMenu)
  }
}
