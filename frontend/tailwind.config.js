/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f8f4',
        ink: '#142014',
        moss: '#3f694d',
        ember: '#c0572e',
        paper: '#ffffff'
      },
      fontFamily: {
        heading: ['"Sora"', 'sans-serif'],
        body: ['"Space Grotesk"', 'sans-serif']
      }
    }
  },
  plugins: []
};
