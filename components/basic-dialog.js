import ButtonCssIcon from "./button-css-icon.js"

export default {
  name: 'BasicDialog',
  props: {
    id: {type: String, required: true},
    sectionStyle: String,
  },
  components: {
    ButtonCssIcon,
  },
  template: `
  <dialog :id="id" closedby="any" class="basic-dialog">
    <header v-if="$slots.header">
      <h2>
        <slot name="header"></slot>
      </h2>
      <button-css-icon icon-name="icon-close" command="close" :commandfor="id"></button-css-icon>
    </header>
    <section :style="sectionStyle">
      <slot name="content"></slot>
    </section>
    <footer v-if="$slots.footer">
      <slot name="footer"></slot>
    </footer>
  </dialog>
  `
}