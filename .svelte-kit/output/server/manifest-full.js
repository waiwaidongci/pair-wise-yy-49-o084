export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.zRQfek0a.js",app:"_app/immutable/entry/app.DO2Y4qmb.js",imports:["_app/immutable/entry/start.zRQfek0a.js","_app/immutable/chunks/B1CDmhaV.js","_app/immutable/chunks/r6FuYyrU.js","_app/immutable/chunks/DQbxFUhK.js","_app/immutable/chunks/B3xakMvx.js","_app/immutable/entry/app.DO2Y4qmb.js","_app/immutable/chunks/DQbxFUhK.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/r6FuYyrU.js","_app/immutable/chunks/Dn8uI3F6.js","_app/immutable/chunks/LwyrCzvg.js","_app/immutable/chunks/Cz8rEje7.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/curriculum",
				pattern: /^\/api\/curriculum\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/curriculum/_server.ts.js'))
			},
			{
				id: "/courses",
				pattern: /^\/courses\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/matrix",
				pattern: /^\/matrix\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/review",
				pattern: /^\/review\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
