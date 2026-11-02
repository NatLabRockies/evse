/**
 * `import url from './x.svg' with { loader: 'file' }` copies the file into the build under
 * media/, with a content hash in its name, and gives the URL to it.
 */
declare module '*.svg' {
  const url: string
  export default url
}
