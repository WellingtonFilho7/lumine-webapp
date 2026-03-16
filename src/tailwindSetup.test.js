import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..');

describe('tailwind local setup', () => {
  test('does not load the Tailwind CDN script in production html', () => {
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'public', 'index.html'), 'utf8');

    expect(indexHtml).not.toContain('https://cdn.tailwindcss.com');
  });

  test('uses Tailwind directives in local css entrypoint', () => {
    const indexCss = fs.readFileSync(path.join(projectRoot, 'src', 'index.css'), 'utf8');

    expect(indexCss).toContain('@tailwind base;');
    expect(indexCss).toContain('@tailwind components;');
    expect(indexCss).toContain('@tailwind utilities;');
  });
});
