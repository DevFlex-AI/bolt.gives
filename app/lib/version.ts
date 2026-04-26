export const APP_VERSION =
  typeof __APP_VERSION !== 'undefined'
    ? __APP_VERSION
    : typeof process !== 'undefined' && process.env?.npm_package_version
    ? process.env.npm_package_version
    : `dev-${Date.now().toString(36)}`;