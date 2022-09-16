import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class TabBarUsage extends Component {
  @action log(message: string): void {
    // eslint-disable-next-line no-console
    console.log(message);
  }
}