import { defineComponent, h, inject, provide, type Component, type InjectionKey } from 'vue'

import type { JmcomicRuntimeService } from './cordis'

export const serviceKey: InjectionKey<JmcomicRuntimeService> = Symbol('jmcomic')

export const useJmcomic = () => {
  const service = inject(serviceKey)
  if (!service) throw new Error('jmcomic service is unavailable')
  return service
}

export const bindComponent = <Props extends object>(
  component: Component<Props>,
  service: JmcomicRuntimeService,
) =>
  defineComponent<Props>(
    (props, { attrs, slots }) => {
      provide(serviceKey, service)
      return () => h(component, { ...attrs, ...props }, slots)
    },
    { name: 'JmcomicProvider', inheritAttrs: false },
  )