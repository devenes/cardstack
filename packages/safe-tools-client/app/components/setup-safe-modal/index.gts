import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import not from 'ember-truth-helpers/helpers/not';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';


import { svgJar } from '@cardstack/boxel/utils/svg-jar';
import cssVar from '@cardstack/boxel/helpers/css-var';
import BoxelModal from '@cardstack/boxel/components/boxel/modal';
import BoxelActionContainer from '@cardstack/boxel/components/boxel/action-container'

import './index.css';

interface Signature {
  Element: HTMLElement;
  Args: { 
    isOpen: boolean 
    onClose: () => void;
  };
}

export default class SetupSafeModal extends Component<Signature> {
  //TODO: replace with correct flags and logic
  gasCost = `0.001899365 ETH (USD$3.01)`;
  notEnoughBalance = false;

  @tracked provisioning = false;

  @action async createSafe(): Promise<void> { 
     //TODO: use sdk method createSafeWithModuleAndGuard
    this.provisioning = true;
    setTimeout(() => {
      console.log('Create safe')
      this.provisioning = false;
      this.args.onClose();
    }, 2000); 
  }

  <template>
    <BoxelModal 
      @size='medium'
      @isOpen={{@isOpen}} 
      @onClose={{@onClose}}
      @isOverlayDismissalDisabled={{this.provisioning}}>
      <BoxelActionContainer as |Section ActionChin|>
        <Section @title='Set up a Payment Safe' class='setup-safe-modal__section'>
          <p>In this step, you create a safe equipped with a module to schedule
            payments.
            <br />What you need to know:
          </p>
          <ul>
            <li>Your payment safe is used to fund your scheduled payments. </li>
            <li>You are the owner of the safe. Only the safe owner can schedule
              payments.
            </li>
            <li>Once you have scheduled payments, the module
              <a
                href='https://github.com/cardstack/cardstack-module-scheduled-payment'
                target='_blank'
                rel='external'
              >
                (source code here)
              </a>
              triggers the payments at the appointed time.
            </li>
            <li>Creating the safe and enabling the module requires a one-time gas
               fee.
            </li>
          </ul>
          <b>Estimated gas cost: {{this.gasCost}}</b>
          <div class='safe-setup-modal__section-wallet-info'>
            {{svgJar
              (if this.notEnoughBalance 'icon-x-circle-ht' 'icon-check-circle-ht')
              class='safe-setup-modal__section-icon'
              style=(cssVar
                icon-color=(if this.notEnoughBalance 'var(--boxel-red)' 'var(--boxel-green)')
              )
            }}
            <p>
              Your wallet has {{if this.notEnoughBalance 'in'}}sufficient funds to cover the estimated gas cost.
            </p>
          </div>
        </Section>
        <ActionChin @state='default'>
          <:default as |ac|>
            <ac.ActionButton
              @loading={{this.provisioning}}
              disabled={{this.notEnoughBalance}}
              {{on 'click' this.createSafe}}
            >
              Provision{{if this.provisioning 'ing'}}
            </ac.ActionButton>
            {{#if (not this.provisioning)}}
              <ac.CancelButton {{on 'click' @onClose}}>
                Cancel
              </ac.CancelButton>
            {{/if}}
          </:default>
        </ActionChin>
      </BoxelActionContainer>
    </BoxelModal>
  </template>
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'SetupSafeModal': typeof SetupSafeModal;
  }
}
