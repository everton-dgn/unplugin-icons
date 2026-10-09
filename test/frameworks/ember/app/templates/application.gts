import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import Icon from '~icons/fixture/sample';
import VirtualIcon from 'virtual:icons/fixture/sample?data-probe=2.5em';
import { capture } from '../capture';
import { rawCases, rawTypes } from '../raw';

export default class Application extends Component {
  @tracked count = 0;
  @tracked visible = true;
  @tracked width = 99;
  label = 'A & B <safe> "quoted"';
  increment = () => { this.count++; this.width++; };
  toggle = () => { this.visible = !this.visible; };

  <template>
    <main>
      <button id="toggle" type="button" {{on "click" this.toggle}}>Toggle icon</button>
      <output id="count">{{this.count}}</output>
      {{#if this.visible}}
        <Icon id="component" width={{this.width}} height="98" fill="blue" class="consumer"
          aria-label={{this.label}} data-count={{this.count}} {{capture}} {{on "click" this.increment}} />
      {{/if}}
      <VirtualIcon id="virtual" />
      <section id="raw">
        {{#each rawCases as |item|}}<div data-index={{item.index}}>{{item.html}}</div>{{/each}}
      </section>
      <pre id="raw-types">{{rawTypes}}</pre>
    </main>
  </template>
}
