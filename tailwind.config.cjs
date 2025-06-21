/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-bg-primary)',
        secondary: 'var(--color-bg-secondary)',
        tertiary: 'var(--color-bg-tertiary)',
        
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-inverted': 'var(--color-text-inverted)',

        'border-primary': 'var(--color-border-primary)',
        'border-secondary': 'var(--color-border-secondary)',
        'border-focus': 'var(--color-border-focus)',

        'accent-primary': 'var(--color-accent-primary)',
        'accent-secondary': 'var(--color-accent-secondary)',
        'accent-tertiary': 'var(--color-accent-tertiary)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-strong': 'var(--color-accent-strong)',

        'highlight-yellow': 'var(--color-highlight-yellow)',
        'highlight-orange': 'var(--color-highlight-orange)',
        'highlight-pink': 'var(--color-highlight-pink)',
        'highlight-green': 'var(--color-highlight-green)',
        'highlight-red': 'var(--color-highlight-red)',
        'highlight-blue': 'var(--color-highlight-blue)',
      }
    },
  },
  plugins: [],
}
