

export interface RadarPoint {
  category: string;
  value: number;
}

export interface RadarSeriesData {
  id: string;
  name: string;
  points: RadarPoint[];
  style?: {
    color?: string;
    fillColor?: string;
    width?: number;
    opacity?: number;
    pointSize?: number;
  };
}

export interface PluginRadarConfig {
  categories: string[];
  maxValue?: number;
  minValue?: number;
  gridLevels?: number;
  showLabels?: boolean;
  labelStyle?: {
    fontSize?: number;
    color?: string;
    fontFamily?: string;
  };
  gridStyle?: {
    color?: string;
    width?: number;
    lineDash?: number[];
  };
}

export interface RadarSVGExportData {
  categories: string[];
  maxValue: number;
  gridLevels: number;
  showLabels: boolean;
  labelStyle?: PluginRadarConfig["labelStyle"];
  gridStyle?: PluginRadarConfig["gridStyle"];
  series: RadarSeriesData[];
}

export interface RadarAPI {
  addSeries(data: RadarSeriesData): string;
  removeSeries(id: string): boolean;
  updateSeries(id: string, points: RadarPoint[]): boolean;
  setCategories(categories: string[]): void;
  setMaxValue(value: number): void;
  /** Snapshot for SVG live renderer / export pipeline */
  getSVGExportData(): RadarSVGExportData | null;
}
