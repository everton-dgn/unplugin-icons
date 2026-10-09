import Icon from '~icons/fixture/sample';
import VirtualIcon from 'virtual:icons/fixture/sample';
import Raw from '~icons-raw/fixture/sample?raw=false';
import VirtualRaw from 'virtual:icons-raw/fixture/sample?raw=false';
import { modifier } from 'ember-modifier';

const acceptSvg = modifier((element: SVGElement) => { void element; });
const acceptDiv = modifier((element: HTMLDivElement) => { void element; });
const strings: string[] = [Raw, VirtualRaw];
void strings;
// @ts-expect-error Components do not export strings.
const invalid: string = Icon;
void invalid;

<template>
  <Icon aria-label="Typed SVG" {{acceptSvg}} />
  <VirtualIcon {{acceptSvg}} />
  {{! @glint-expect-error: Icons do not declare component arguments. }}
  <Icon @unsupported={{true}} />
  {{! @glint-expect-error: SVGElement is not HTMLDivElement. }}
  <Icon {{acceptDiv}} />
  {{! @glint-expect-error: Raw imports are strings, not components. }}
  <Raw />
</template>
