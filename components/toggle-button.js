export default {
  name: 'ToggleButton',
  props: {
    isChecked: {
      type: Boolean,
      required: true,
    },
    topIsSlider: Boolean,
    text: String,
    textChecked: String,
    textNotChecked: String,
  },
  emits: ['checked-toggle'],
  template: `
  <label class="toggle-button">
    <input type="checkbox" :checked="isChecked" @change="(e)=>$emit('checked-toggle', e.currentTarget.checked)"/>
    <span v-if="topIsSlider" class="slider"></span>
    <span v-if="text">{{text}}</span>
    <span v-if="textChecked" class="checked">{{textChecked}}</span>
    <span v-if="textNotChecked" class="not-checked">{{textNotChecked}}</span>
    <span v-if="!topIsSlider" class="slider"></span>
  </label>
  `
}