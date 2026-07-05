import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        'velo-plot': resolve(__dirname, 'src/index.core.ts'),
        'velo-plot.full': resolve(__dirname, 'src/index.ts'),
        'react': resolve(__dirname, 'src/react/index.ts'),
        'plugins/3d': resolve(__dirname, 'src/plugins/3d/index.ts'),
        'plugins/gpu': resolve(__dirname, 'src/plugins/gpu/index.ts'),
        'plugins/analysis': resolve(__dirname, 'src/plugins/analysis/index.ts'),
        'plugins/tools': resolve(__dirname, 'src/plugins/tools/index.ts'),
        'plugins/annotations': resolve(__dirname, 'src/plugins/annotations/index.ts'),
        'plugins/streaming': resolve(__dirname, 'src/plugins/streaming/index.ts'),
        'plugins/theme-editor': resolve(__dirname, 'src/plugins/theme-editor/index.ts'),
        'plugins/i18n': resolve(__dirname, 'src/plugins/i18n/index.ts'),
        'plugins/keyboard': resolve(__dirname, 'src/plugins/keyboard/index.ts'),
        'plugins/clipboard': resolve(__dirname, 'src/plugins/clipboard/index.ts'),
        'plugins/sync': resolve(__dirname, 'src/plugins/sync/index.ts'),
        'plugins/debug': resolve(__dirname, 'src/plugins/debug/index.ts'),
        'plugins/loading': resolve(__dirname, 'src/plugins/loading/index.ts'),
        'plugins/data-export': resolve(__dirname, 'src/plugins/data-export/index.ts'),
        'plugins/context-menu': resolve(__dirname, 'src/plugins/context-menu/index.ts'),
        'plugins/snapshot': resolve(__dirname, 'src/plugins/snapshot/index.ts'),
        'plugins/video-recorder': resolve(__dirname, 'src/plugins/video-recorder/index.ts'),
        'plugins/roi': resolve(__dirname, 'src/plugins/roi/index.ts'),
        'plugins/virtualization': resolve(__dirname, 'src/plugins/virtualization/index.ts'),
        'plugins/offscreen': resolve(__dirname, 'src/plugins/offscreen/index.ts'),
        'plugins/broken-axis': resolve(__dirname, 'src/plugins/broken-axis/index.ts'),
        'plugins/anomaly-detection': resolve(__dirname, 'src/plugins/anomaly-detection/index.ts'),
        'plugins/latex': resolve(__dirname, 'src/plugins/latex/index.ts'),
        'plugins/data-transform': resolve(__dirname, 'src/plugins/data-transform/index.ts'),
        'plugins/ml-integration': resolve(__dirname, 'src/plugins/ml-integration/index.ts'),
        'plugins/radar': resolve(__dirname, 'src/plugins/radar/index.ts'),
        'plugins/regression': resolve(__dirname, 'src/plugins/regression/index.ts'),
        'plugins/lazy-load': resolve(__dirname, 'src/plugins/lazy-load/index.ts'),
        'plugins/caching': resolve(__dirname, 'src/plugins/caching/index.ts'),
        'plugins/pattern-recognition': resolve(__dirname, 'src/plugins/pattern-recognition/index.ts'),
        'plugins/forecasting': resolve(__dirname, 'src/plugins/forecasting/index.ts'),
      },
      name: 'SciPlot',
      formats: ['es']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    sourcemap: true,
    emptyOutDir: true
  },
  plugins: [
    dts({
      include: ['src'],
      insertTypesEntry: true,
    })
  ]
});
