// Raw font-unit outlines are required for independent round-trip tests.
import 'opentype.js';
declare module 'opentype.js' { interface Glyph { path: Path } }
