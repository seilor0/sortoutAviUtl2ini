export default {
  name: 'ButtonCssIcon',
  props:{
    iconName:String
  },
  template:`
  <button class="icon-frame">
    <div class="icon" :class="iconName"></div>
  </button>
  `
}