import Component from '@glimmer/component';
import '@cardstack/boxel/styles/global.css';
import './index.css';
import cn from '@cardstack/boxel/helpers/cn';

//@ts-expect-error glint does not think this is consumed-but it is consumed in the template https://github.com/typed-ember/glint/issues/374
import { hash } from '@ember/helper';
import eq from 'ember-truth-helpers/helpers/eq';
import { Input } from '@ember/component';
import { on } from '@ember/modifier';
import optional from 'ember-composable-helpers/helpers/optional';
import { action } from '@ember/object';
import { WithBoundArgs } from '@glint/template';
import type { TemplateOnlyComponent } from '@ember/component/template-only';

interface Signature {
  Element: HTMLFieldSetElement;
  Args: {
    disabled?: boolean;
    groupDescription: string;
    name: string;
    onChange: ((value: string) => void);
    value?: string;
  };
  Blocks: {
    'default': [{ Button: WithBoundArgs<typeof Button, 'disabled'|'chosenValue'|'name'|'onChange'> }],
  }
}

interface ButtonSignature {
  Element: HTMLElement
  Args: {
    chosenValue?: string;
    disabled: boolean;
    name: string;
    onChange: ((event: InputEvent) => void);
    value: string;
  },
  Blocks: {
    default: [],
  }
}

const Button: TemplateOnlyComponent<ButtonSignature> =
<template>
  {{#let (eq @value @chosenValue) as |checked|}}
    <label
      class={{cn
        "boxel-toggle-button-group-option"
        boxel-toggle-button-group-option--checked=checked
        boxel-toggle-button-group-option--disabled=@disabled
      }}
      ...attributes
    >
      <Input
        name={{@name}}
        class={{cn
          "boxel-toggle-button-group-option__input"
          boxel-toggle-button-group-option__input--checked=checked
        }}
        @type="radio"
        @value={{@value}}
        disabled={{@disabled}}
        {{on "change" (optional @onChange)}}
      />
      <div>
        {{yield}}
      </div>
    </label>
  {{/let}}
</template>;

export default class ToggleButtonGroupComponent extends Component<Signature> {
  @action changeValue(e: Event) {
    let value = (e.target as HTMLInputElement).value;
    this.args.onChange?.(value);
  }

  <template>
    <fieldset class="boxel-toggle-button-group__fieldset" disabled={{@disabled}} ...attributes>
      <legend class="boxel-toggle-button-group__fieldset-legend">
        {{@groupDescription}}
      </legend>
      {{!-- this div is necessary because Chrome has a special case for fieldsets and it breaks grid auto placement --}}
      <div class="boxel-toggle-button-group__fieldset-container">
        {{yield
            (hash
              Button=(component
                Button
                kind="primary"
                disabled=@disabled
                name=@name
                onChange=this.changeValue
                chosenValue=@value
              )
            )
        }}
      </div>
    </fieldset>
  </template>
}


declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'Boxel::ToggleButtonGroup': typeof ToggleButtonGroupComponent;
  }
}
