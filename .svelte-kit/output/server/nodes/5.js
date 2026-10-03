import * as server from '../entries/pages/review/_page.server.ts.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/review/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/review/+page.server.ts";
export const imports = ["_app/immutable/nodes/5.DQtUCift.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DQbxFUhK.js","_app/immutable/chunks/Dn8uI3F6.js","_app/immutable/chunks/LwyrCzvg.js","_app/immutable/chunks/DyD6cuYt.js","_app/immutable/chunks/ge3yAq1P.js","_app/immutable/chunks/DIB4aysN.js","_app/immutable/chunks/B3xakMvx.js","_app/immutable/chunks/r6FuYyrU.js","_app/immutable/chunks/B1CDmhaV.js"];
export const stylesheets = ["_app/immutable/assets/5.CVv9quhM.css"];
export const fonts = [];
