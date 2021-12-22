import { dirname } from 'path';

export class FileCacheConfig {
  packageName = '@cardstack/compiled';

  get root() {
    return process.cwd();
  }

  get cacheDirectory() {
    return dirname(__non_webpack_require__.resolve('@cardstack/compiled/package.json'));
  }
}

declare module '@cardstack/di' {
  interface KnownServices {
    'file-cache-config': FileCacheConfig;
  }
}