import type { ProgramBundle } from "./types";
import { createCoreProgramBundle } from "./programFactoryCore";

export function createProgramBundle(gl: WebGLRenderingContext): ProgramBundle {
  return createCoreProgramBundle(gl);
}
