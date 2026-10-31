// Entry point for `node --test --import ./tests/compat/register.mjs`.
//
// 1. Registers the ESM resolve hook (source resolution + runner stubs).
// 2. Imports the compat runtime, which injects `describe/it/expect/jest/vi`
//    as globals so implicit-Jest-global tests resolve them without imports.

import { register } from 'node:module';
register('./resolve-hook.mjs', import.meta.url);
import './runtime.mjs';
