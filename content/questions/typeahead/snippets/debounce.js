// debounce.js: run fn only after `ms` of silence; every new call restarts the wait
export function debounce(fn, ms) {
  let timer;
  const debounced = (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  debounced.cancel = () => clearTimeout(timer);                       // call on unmount so a late timer can't fire
  return debounced;
}
