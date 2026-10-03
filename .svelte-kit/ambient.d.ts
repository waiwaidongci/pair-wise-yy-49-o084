
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const NODE_ENV: string;
	export const COLORTERM: string;
	export const CODEX_SESSION_ID: string;
	export const GIT_PAGER: string;
	export const npm_config_user_agent: string;
	export const npm_lifecycle_script: string;
	export const npm_config_cache: string;
	export const GH_PAGER: string;
	export const LOG_FORMAT: string;
	export const CODEX_SAGE_BACKFILL_TRACKER_TAB_REUSE: string;
	export const HOME: string;
	export const npm_config_prefix: string;
	export const SHLVL: string;
	export const CODEX_VERSION: string;
	export const npm_package_version: string;
	export const npm_package_json: string;
	export const CODEX_CI: string;
	export const VOLTA_HOME: string;
	export const npm_lifecycle_event: string;
	export const DISABLE_AUTO_UPDATE: string;
	export const JAVA_HOME: string;
	export const PWD: string;
	export const npm_config_node_gyp: string;
	export const XPC_FLAGS: string;
	export const npm_command: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const npm_config_init_module: string;
	export const npm_config_npm_version: string;
	export const CODEX_THREAD_ID: string;
	export const CODEX_PERMISSION_PROFILE: string;
	export const npm_execpath: string;
	export const npm_config_userconfig: string;
	export const SVELTEKIT_FORK: string;
	export const npm_node_execpath: string;
	export const npm_config_registry: string;
	export const _: string;
	export const LC_CTYPE: string;
	export const PATH: string;
	export const PAGER: string;
	export const COMMAND_MODE: string;
	export const SSH_AUTH_SOCK: string;
	export const npm_config_globalconfig: string;
	export const LC_ALL: string;
	export const CODEX_MCP_NODE_PATH: string;
	export const TERM: string;
	export const TMPDIR: string;
	export const MallocNanoZone: string;
	export const LOGNAME: string;
	export const CODEX_SHELL: string;
	export const RUST_LOG: string;
	export const npm_config_local_prefix: string;
	export const ZSH_TMUX_AUTOSTARTED: string;
	export const npm_package_name: string;
	export const npm_config_noproxy: string;
	export const LANG: string;
	export const CODEX_APP_TOOLS_PIPE_PATH: string;
	export const SHELL: string;
	export const COLOR: string;
	export const NO_COLOR: string;
	export const XPC_SERVICE_NAME: string;
	export const npm_config_global_prefix: string;
	export const PYENV_ROOT: string;
	export const CODEX_INTERNAL_ORIGINATOR_OVERRIDE: string;
	export const _VOLTA_TOOL_RECURSION: string;
	export const NODE: string;
	export const INIT_CWD: string;
	export const EDITOR: string;
	export const ZSH_TMUX_AUTOSTART: string;
	export const PYENV_SHELL: string;
	export const USER: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		NODE_ENV: string;
		COLORTERM: string;
		CODEX_SESSION_ID: string;
		GIT_PAGER: string;
		npm_config_user_agent: string;
		npm_lifecycle_script: string;
		npm_config_cache: string;
		GH_PAGER: string;
		LOG_FORMAT: string;
		CODEX_SAGE_BACKFILL_TRACKER_TAB_REUSE: string;
		HOME: string;
		npm_config_prefix: string;
		SHLVL: string;
		CODEX_VERSION: string;
		npm_package_version: string;
		npm_package_json: string;
		CODEX_CI: string;
		VOLTA_HOME: string;
		npm_lifecycle_event: string;
		DISABLE_AUTO_UPDATE: string;
		JAVA_HOME: string;
		PWD: string;
		npm_config_node_gyp: string;
		XPC_FLAGS: string;
		npm_command: string;
		__CF_USER_TEXT_ENCODING: string;
		npm_config_init_module: string;
		npm_config_npm_version: string;
		CODEX_THREAD_ID: string;
		CODEX_PERMISSION_PROFILE: string;
		npm_execpath: string;
		npm_config_userconfig: string;
		SVELTEKIT_FORK: string;
		npm_node_execpath: string;
		npm_config_registry: string;
		_: string;
		LC_CTYPE: string;
		PATH: string;
		PAGER: string;
		COMMAND_MODE: string;
		SSH_AUTH_SOCK: string;
		npm_config_globalconfig: string;
		LC_ALL: string;
		CODEX_MCP_NODE_PATH: string;
		TERM: string;
		TMPDIR: string;
		MallocNanoZone: string;
		LOGNAME: string;
		CODEX_SHELL: string;
		RUST_LOG: string;
		npm_config_local_prefix: string;
		ZSH_TMUX_AUTOSTARTED: string;
		npm_package_name: string;
		npm_config_noproxy: string;
		LANG: string;
		CODEX_APP_TOOLS_PIPE_PATH: string;
		SHELL: string;
		COLOR: string;
		NO_COLOR: string;
		XPC_SERVICE_NAME: string;
		npm_config_global_prefix: string;
		PYENV_ROOT: string;
		CODEX_INTERNAL_ORIGINATOR_OVERRIDE: string;
		_VOLTA_TOOL_RECURSION: string;
		NODE: string;
		INIT_CWD: string;
		EDITOR: string;
		ZSH_TMUX_AUTOSTART: string;
		PYENV_SHELL: string;
		USER: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
