export default config;

interface UrlsOptions {
  about: string;
  appStoreLink: string;
  googlePlayLink: string;
  mailToSupportUrl: string;
  statusPageBase: string;
  statusPageUrl: string;
}

/**
 * Type declarations for
 *    import config from 'my-app/config/environment'
 */
declare const config: {
  environment: string;
  modulePrefix: string;
  podModulePrefix: string;
  locationType: string;
  rootURL: string;
  hubURL: string;
  universalLinkDomain: string;
  version: string;
  urls: UrlsOptions;
  walletConnectIcons: string[];
  APP: Record<string, unknown>;
};