/** Stub for benchmark page — react is peer-only in velo-plot.full */
export default {};
export const useState = () => [undefined, () => {}];
export const useEffect = () => {};
export const useRef = () => ({ current: null });
export const useCallback = (fn) => fn;
export const useMemo = (fn) => fn();
