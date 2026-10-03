import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.C7ZCq4I2.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DQbxFUhK.js","_app/immutable/chunks/LwyrCzvg.js","_app/immutable/chunks/DyD6cuYt.js","_app/immutable/chunks/ge3yAq1P.js","_app/immutable/chunks/DfyKwfUX.js","_app/immutable/chunks/B3xakMvx.js","_app/immutable/chunks/r6FuYyrU.js","_app/immutable/chunks/CewwrIQj.js","_app/immutable/chunks/Cz8rEje7.js"];
export const stylesheets = ["_app/immutable/assets/0.D-zsmaOh.css"];
export const fonts = [];
