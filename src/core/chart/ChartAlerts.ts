/**
 * Price alert registry (Stage 2.18).
 */

import type { EventEmitter } from "../EventEmitter";
import type { ChartEventMap } from "../../types";

export type AlertDirection = "above" | "below" | "cross";

export interface PriceAlertOptions {
  id?: string;
  price: number;
  direction: AlertDirection;
  seriesId?: string;
  /** Fire once then remove (default true) */
  once?: boolean;
}

export interface AlertEvent {
  id: string;
  price: number;
  direction: AlertDirection;
  seriesId?: string;
  triggeredAt: number;
  triggerPrice: number;
}

export interface AlertableSeries {
  getId(): string;
  getData(): { x: Float32Array | Float64Array; y?: Float32Array | Float64Array; close?: Float32Array | Float64Array };
}

export class ChartAlertManager {
  private alerts = new Map<string, PriceAlertOptions & { id: string }>();
  private idCounter = 0;

  constructor(
    private events: EventEmitter<ChartEventMap>,
    private getSeries: (id?: string) => AlertableSeries | undefined,
  ) {}

  addAlert(options: PriceAlertOptions): string {
    const id = options.id ?? `alert_${++this.idCounter}`;
    this.alerts.set(id, { ...options, id });
    return id;
  }

  removeAlert(id: string): boolean {
    return this.alerts.delete(id);
  }

  clearAlerts(): void {
    this.alerts.clear();
  }

  getAlerts(): PriceAlertOptions[] {
    return Array.from(this.alerts.values());
  }

  /** Call after data updates / render tick. */
  evaluate(): void {
    for (const [id, alert] of [...this.alerts.entries()]) {
      const series = this.getSeries(alert.seriesId);
      if (!series) continue;

      const data = series.getData();
      const prices = data.close ?? data.y;
      if (!prices?.length) continue;

      const latest = prices[prices.length - 1];
      if (!Number.isFinite(latest)) continue;

      const prev = prices.length > 1 ? prices[prices.length - 2] : latest;
      let triggered = false;

      switch (alert.direction) {
        case "above":
          triggered = latest >= alert.price;
          break;
        case "below":
          triggered = latest <= alert.price;
          break;
        case "cross":
          triggered =
            (prev < alert.price && latest >= alert.price) ||
            (prev > alert.price && latest <= alert.price);
          break;
      }

      if (!triggered) continue;

      const payload: AlertEvent = {
        id,
        price: alert.price,
        direction: alert.direction,
        seriesId: alert.seriesId ?? series.getId(),
        triggeredAt: Date.now(),
        triggerPrice: latest,
      };

      this.events.emit("alert", payload);

      if (alert.once !== false) {
        this.alerts.delete(id);
      }
    }
  }

  destroy(): void {
    this.alerts.clear();
  }
}
