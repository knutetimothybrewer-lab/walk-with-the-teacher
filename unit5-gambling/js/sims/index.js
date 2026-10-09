// Simulation registry. Each lab is loaded only when needed. A lab module exports mount(container, ctx) -> { destroy() }.
const LOADERS = {
  coin: () => import('./coin.js'), house: () => import('./house.js'), sports: () => import('./sports.js'),
  brain: () => import('./brain.js'), adlab: () => import('./adlab.js'), decide: () => import('./decide.js')
};
export async function mountSim(id, container, ctx) {
  if (!LOADERS[id]) throw new Error('Unknown lab: ' + id);
  const mod = await LOADERS[id]();
  return mod.mount(container, ctx);
}
