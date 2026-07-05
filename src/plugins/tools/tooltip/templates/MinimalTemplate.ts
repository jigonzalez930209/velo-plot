/**
 * Minimal Tooltip Template
 * 
 * Ultra-compact template showing only essential values.
 * Perfect for dashboards with limited space.
 * 
 * @module tooltip/templates/MinimalTemplate
 */

import type {
  DataPointTooltip,
  TooltipTemplate,
  TooltipMeasurement,
  TooltipPosition,
  TooltipTheme,
  TooltipType
} from '../types';
import { formatCompactValue } from '../format';

/**
 * Minimal Template
 * 
 * Visual layout:
 * ┌───────────────────╮
 * │ 0.500 ▪ 1.23µA    │
 * ╰───────────────────╯
 */
export class MinimalTooltipTemplate implements TooltipTemplate<DataPointTooltip> {
  readonly id = 'minimal';
  readonly name = 'Minimal';
  readonly supportedTypes: TooltipType[] = ['datapoint'];

  // Cached measurements
  private cachedKey: string = '';
  private cachedMeasurement: TooltipMeasurement | null = null;

  /**
   * Measure tooltip dimensions
   */
  measure(
    ctx: CanvasRenderingContext2D,
    data: DataPointTooltip,
    theme: TooltipTheme
  ): TooltipMeasurement {
    // Cache key
    const cacheKey = `${data.seriesId}-${data.dataIndex}-${data.dataX}-${data.dataY}-${theme.fontFamily}`;
    if (cacheKey === this.cachedKey && this.cachedMeasurement) {
      return this.cachedMeasurement;
    }

    // Set font for measurement
    ctx.font = `${theme.contentFontSize}px ${theme.fontFamily}`;
    
    // Create compact text
    const text = `${formatCompactValue(data, 'x')} ▪ ${formatCompactValue(data, 'y')}`;
    const textWidth = ctx.measureText(text).width;
    
    this.cachedMeasurement = {
      width: textWidth,
      height: theme.contentFontSize * theme.lineHeight,
      padding: {
        top: 6,
        right: 8,
        bottom: 6,
        left: 8
      }
    };
    this.cachedKey = cacheKey;
    
    return this.cachedMeasurement;
  }

  /**
   * Render the tooltip
   */
  render(
    ctx: CanvasRenderingContext2D,
    data: DataPointTooltip,
    position: TooltipPosition,
    measurement: TooltipMeasurement,
    theme: TooltipTheme
  ): void {
    const { padding } = measurement;
    const x = position.x + padding.left;
    const y = position.y + padding.top;
    
    // Create compact text
    const xValue = formatCompactValue(data, 'x');
    const yValue = formatCompactValue(data, 'y');
    
    ctx.save();
    ctx.font = `${theme.contentFontSize}px ${theme.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Draw X value
    ctx.fillStyle = theme.textSecondaryColor;
    ctx.fillText(xValue, x, y);
    
    // Draw separator
    const xWidth = ctx.measureText(xValue).width;
    ctx.fillStyle = data.seriesColor;
    ctx.fillText(' ▪ ', x + xWidth, y);
    
    // Draw Y value
    const sepWidth = ctx.measureText(' ▪ ').width;
    ctx.fillStyle = theme.textColor;
    ctx.fillText(yValue, x + xWidth + sepWidth, y);
    
    ctx.restore();
  }
}

// Export singleton instance
export const minimalTooltipTemplate = new MinimalTooltipTemplate();
