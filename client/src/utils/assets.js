// Resolves dev-style paths such as "/src/assets/icons/Dashboard.png" to the real
// bundled URL. Plain "/src/..." URLs only work on the Vite dev server; in a
// production build the files are hashed and moved, so they must go through the bundler.
const bundled = import.meta.glob('../assets/**/*.{png,jpg,jpeg,svg}', { eager: true, import: 'default' });

export function resolveAsset(path) {
  return bundled[path.replace(/^\/src\//, '../')] ?? path;
}
