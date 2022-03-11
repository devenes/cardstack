import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import AppContextService from '@cardstack/ssr-web/services/app-context';

export default class NotFoundRoute extends Route {
  @service('app-context') declare appContext: AppContextService;

  beforeModel() {
    if (this.appContext.isCardSpace) {
      this.transitionTo('index');
    } else {
      throw new Error('404: Not Found');
    }
  }
}