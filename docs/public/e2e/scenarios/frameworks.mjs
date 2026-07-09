import { assert, hostEl, lineData } from "./data.mjs";

function seriesProps() {
  const { x, y } = lineData(30);
  return [{ id: "line", x, y, color: "#00f2ff" }];
}

function mountFrame(width = 640, height = 360) {
  const mountEl = document.createElement("div");
  mountEl.style.width = `${width}px`;
  mountEl.style.height = `${height}px`;
  hostEl().appendChild(mountEl);
  return mountEl;
}

async function waitForSelector(root, selector, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = root.querySelector(selector);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`${selector} not found within ${timeout}ms`);
}

export const frameworkScenarios = {
  "framework-react-veloplot": async () => {
    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { VeloPlot } = await import("/dist/react.js");
    const mountEl = mountFrame();
    const root = createRoot(mountEl);
    root.render(
      React.createElement(VeloPlot, {
        series: seriesProps(),
        height: 360,
        animations: false,
      }),
    );
    await waitForSelector(mountEl, ".velo-plot-container");
    root.unmount();
    return { framework: "react" };
  },

  "framework-react-stackedplot": async () => {
    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { StackedPlot } = await import("/dist/react.js");
    const mountEl = mountFrame(640, 400);
    const root = createRoot(mountEl);
    root.render(
      React.createElement(StackedPlot, {
        panes: [
          { id: "price", height: 0.7, series: [] },
          { id: "volume", height: 0.3, series: [] },
        ],
        height: 400,
        animations: false,
      }),
    );
    await waitForSelector(mountEl, ".velo-plot-stacked");
    root.unmount();
    return { framework: "react", component: "StackedPlot" };
  },

  "framework-vue-veloplot": async () => {
    const { createApp, h } = await import("vue");
    const { VeloPlot } = await import("/dist/vue.js");
    const mountEl = mountFrame();
    const app = createApp({
      render: () =>
        h(VeloPlot, {
          series: seriesProps(),
          height: 360,
          animations: false,
        }),
    });
    app.mount(mountEl);
    await waitForSelector(mountEl, ".velo-plot-container");
    app.unmount();
    return { framework: "vue" };
  },

  "framework-svelte-create-veloplot": async () => {
    const { createVeloPlot } = await import("/dist/svelte.js");
    const { get } = await import("svelte/store");
    const mountEl = mountFrame();
    const api = createVeloPlot({ animations: false });
    api.mount(mountEl);
    const start = Date.now();
    let ready = false;
    while (Date.now() - start < 8000) {
      if (get(api.isReady)) {
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    assert(ready, "svelte createVeloPlot not ready");
    api.addSeries({
      id: "line",
      type: "line",
      data: lineData(20),
    });
    api.unmount();
    return { framework: "svelte" };
  },

  "framework-solid-veloplot": async () => {
    const { render } = await import("solid-js/web");
    const { VeloPlot } = await import("/dist/solid.js");
    const mountEl = mountFrame();
    const dispose = render(
      () =>
        VeloPlot({
          series: seriesProps(),
          height: 360,
          animations: false,
        }),
      mountEl,
    );
    await waitForSelector(mountEl, ".velo-plot-container");
    dispose();
    return { framework: "solid" };
  },

  "framework-angular-hooks": async () => {
    const { useVeloPlotAngular } = await import("/dist/angular-hooks.js");
    const host = useVeloPlotAngular();
    const mountEl = mountFrame();
    host.mount(mountEl, { animations: false });
    assert(host.chart, "angular host chart missing");
    host.ngOnDestroy();
    return { framework: "angular" };
  },

  "framework-astro-wrapper": async () => {
    const res = await fetch("/dist/astro/VeloPlot.astro");
    assert(res.ok, "VeloPlot.astro not published in dist/astro");
    const text = await res.text();
    assert(text.includes("VeloPlot"), "astro wrapper must reference VeloPlot");
    assert(text.includes("client:only"), "astro wrapper must use client:only");
    return { framework: "astro" };
  },
};
