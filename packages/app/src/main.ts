import '@/index.css'
import type { Component } from '@delta-comic/client'

import { jmcomicFunctions } from '@/plugin/cordis'
import { provideJmcomic } from '@/runtime/cordis'

export default Object.freeze([provideJmcomic, ...jmcomicFunctions] satisfies Component.Function[])