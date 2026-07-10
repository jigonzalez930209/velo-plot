declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module "*.svelte" {
  import type { Component } from "svelte";
  const component: Component;
  export default component;
}
