// tailwind.config.js
module.exports = {
  content: [
    "./views/**/*.{hbs,html}", // analizza i template hbs e html
    "./public/**/*.{js,css}", // se hai file JS o CSS nel public
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
}
