import type { ChartPlugin, PluginFactory, PluginManifest } from "./types";

export function createPlugin<TConfig = void, TApi extends Record<string, unknown> = {}>(
  definition: ChartPlugin<TConfig> & { api?: TApi },
): ChartPlugin<TConfig> & { api: TApi } {
  return definition as ChartPlugin<TConfig> & { api: TApi };
}

export function createConfigurablePlugin<TConfig = void>(
  manifest: PluginManifest,
  factory: (config?: TConfig) => Omit<ChartPlugin<TConfig>, "manifest">,
): PluginFactory<TConfig> {
  return (config?: TConfig) => ({
    ...factory(config),
    manifest,
  });
}
