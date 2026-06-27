import blessed from 'blessed';

// Initialize the screen container
const screen = blessed.screen({
  smartCSR: true,
  title: 'Deployment Pipeline Monitor'
});

// Create an isolated box container with word wrap
const outputBox = blessed.box({
  top: 'center',
  left: 'center',
  width: '60%',
  height: '50%',
  content: 'Your long deployment string goes here and it will wrap automatically...',
  tags: true, // Allows formatting colors like {red-fg}text{/red-fg}
  border: { type: 'line' },
  style: {
    fg: 'white',
    bg: 'black',
    border: { fg: '#f0f0f0' }
  },
  wrap: true // 🗲 Enables automatic word wrapping within the box boundaries
});

// Append to screen and render
screen.append(outputBox);
screen.render();

// Allow quitting with Control-C
screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

