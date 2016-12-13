import typescript from 'typescript';
import ts from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  entry: 'src/index.ts',
  dest: 'dist/experiment.js',
  plugins: [
    ts({ typescript }),
    resolve({ module: true, jsnext: true }),
    commonjs({
      include: [
        'node_modules/free-style/**'
      ]
    })
  ]
}