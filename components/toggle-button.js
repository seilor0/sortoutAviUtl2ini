export default {
  name: 'ToggleButton',
  props: {
    isChecked: {
      type: Boolean,
      required: true,
    },
    topIsSlider: Boolean,
  },
  emits: ['checked-toggle'],
  template: `
  <label class="toggle-button">
    <input type="checkbox" :checked="isChecked" @change="(e)=>$emit('checked-toggle', e.currentTarget.checked)"/>
    <span v-if="topIsSlider" class="toggle-button__slider"></span>
    <span v-if="$slots.default"><slot></slot></span>
    <span v-if="$slots.checked" class="checked"><slot name="checked"></slot></span>
    <span v-if="$slots['not-checked']" class="not-checked"><slot name="not-checked"></slot></span>
    <span v-if="!topIsSlider" class="toggle-button__slider"></span>
  </label>
  `
}