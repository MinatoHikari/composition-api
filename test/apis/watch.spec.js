import Vue from 'vue/dist/vue.common.js'
import {
  ref,
  reactive,
  watch,
  watchEffect,
  set,
  computed,
  nextTick,
  markRaw,
} from '../../src'
import { mockWarn } from '../helpers'

describe('api/watch', () => {
  mockWarn(true)
  const anyFn = expect.any(Function)
  let spy
  beforeEach(() => {
    spy = vi.fn()
  })

  afterEach(() => {
    spy.mockReset()
  })

  it('should work', () =>
    new Promise((done, reject) => {
      done.fail = reject

      const onCleanupSpy = vi.fn()
      const vm = new Vue({
        setup() {
          const a = ref(1)
          watch(
            a,
            (n, o, _onCleanup) => {
              spy(n, o, _onCleanup)
              _onCleanup(onCleanupSpy)
            },
            { immediate: true }
          )
          return {
            a,
          }
        },
        template: `<div>{{a}}</div>`,
      }).$mount()
      expect(spy).toBeCalledTimes(1)
      expect(spy).toHaveBeenLastCalledWith(1, undefined, anyFn)
      expect(onCleanupSpy).toHaveBeenCalledTimes(0)
      vm.a = 2
      vm.a = 3
      expect(spy).toBeCalledTimes(1)
      waitForUpdate(() => {
        expect(spy).toBeCalledTimes(2)
        expect(spy).toHaveBeenLastCalledWith(3, 1, anyFn)
        expect(onCleanupSpy).toHaveBeenCalledTimes(1)

        vm.$destroy()
      })
        .then(() => {
          expect(onCleanupSpy).toHaveBeenCalledTimes(2)
        })
        .then(done)
    }))

  it('basic usage(value wrapper)', () =>
    new Promise((done, reject) => {
      done.fail = reject

      const vm = new Vue({
        setup() {
          const a = ref(1)
          watch(a, (n, o) => spy(n, o), { flush: 'pre', immediate: true })

          return {
            a,
          }
        },
        template: `<div>{{a}}</div>`,
      }).$mount()
      expect(spy).toBeCalledTimes(1)
      expect(spy).toHaveBeenLastCalledWith(1, undefined)
      vm.a = 2
      expect(spy).toBeCalledTimes(1)
      waitForUpdate(() => {
        expect(spy).toBeCalledTimes(2)
        expect(spy).toHaveBeenLastCalledWith(2, 1)
      }).then(done)
    }))

  it('basic usage(function)', () =>
    new Promise((done, reject) => {
      done.fail = reject

      const vm = new Vue({
        setup() {
          const a = ref(1)
          watch(
            () => a.value,
            (n, o) => spy(n, o),
            { immediate: true }
          )

          return {
            a,
          }
        },
        template: `<div>{{a}}</div>`,
      }).$mount()
      expect(spy).toBeCalledTimes(1)
      expect(spy).toHaveBeenLastCalledWith(1, undefined)
      vm.a = 2
      expect(spy).toBeCalledTimes(1)
      waitForUpdate(() => {
        expect(spy).toBeCalledTimes(2)
        expect(spy).toHaveBeenLastCalledWith(2, 1)
      }).then(done)
    }))

  it('multiple cbs (after option merge)', () =>
    new Promise((done, reject) => {
      done.fail = reject

      const spy1 = vi.fn()
      const a = ref(1)
      const Test = Vue.extend({
        setup() {
          watch(a, (n, o) => spy1(n, o))
        },
      })
      new Test({
        setup() {
          watch(a, (n, o) => spy(n, o))
          return {
            a,
          }
        },
        template: `<div>{{a}}</div>`,
      }).$mount()
      a.value = 2
      waitForUpdate(() => {
        expect(spy1).toHaveBeenLastCalledWith(2, 1)
        expect(spy).toHaveBeenLastCalledWith(2, 1)
      }).then(done)
    }))

  it('with option: lazy', () =>
    new Promise((done, reject) => {
      done.fail = reject

      const vm = new Vue({
        setup() {
          const a = ref(1)
          watch(a, (n, o) => spy(n, o), { lazy: true })

          return {
            a,
          }
        },
        template: `<div>{{a}}</div>`,
      }).$mount()
      expect(spy).not.toHaveBeenCalled()
      vm.a = 2
      waitForUpdate(() => {
        expect(spy).toHaveBeenLastCalledWith(2, 1)
      }).then(done)
    }))

  it('with option: deep', () =>
    new Promise((done, reject) => {
      done.fail = reject

      const vm = new Vue({
        setup() {
          const a = ref({ b: 1 })
          watch(a, (n, o) => spy(n, o), { lazy: true, deep: true })

          return {
            a,
          }
        },
        template: `<div>{{a}}</div>`,
      }).$mount()
      const oldA = vm.a
      expect(spy).not.toHaveBeenCalled()
      vm.a.b = 2
      expect(spy).not.toHaveBeenCalled()
      waitForUpdate(() => {
        expect(spy).toHaveBeenLastCalledWith(vm.a, vm.a)
        vm.a = { b: 3 }
      })
        .then(() => {
          expect(spy).toHaveBeenLastCalledWith(vm.a, oldA)
        })
        .then(done)
    }))

  it('markRaw', () =>
    new Promise((done, reject) => {
      done.fail = reject

      const nestedState = ref(100)

      const state = ref({
        rawValue: markRaw({
          nestedState,
        }),
      })

      watch(
        state,
        () => {
          spy()
        },
        { deep: true }
      )

      function changeRawValue() {
        nestedState.value = Math.random()
      }

      changeRawValue()

      waitForUpdate(() => {
        expect(spy).not.toBeCalled()
      }).then(done)
    }))

  it('should flush after render (immediate=false)', () =>
    new Promise((done, reject) => {
      done.fail = reject

      let rerenderedText
      const vm = new Vue({
        setup() {
          const a = ref(1)
          watch(
            a,
            (newVal, oldVal) => {
              spy(newVal, oldVal)
              rerenderedText = vm.$el.textContent
            },
            { lazy: true, flush: 'post' }
          )
          return {
            a,
          }
        },
        render(h) {
          return h('div', this.a)
        },
      }).$mount()
      expect(spy).not.toHaveBeenCalled()
      vm.a = 2
      waitForUpdate(() => {
        expect(rerenderedText).toBe('2')
        expect(spy).toBeCalledTimes(1)
        expect(spy).toHaveBeenLastCalledWith(2, 1)
      }).then(done)
    }))

  it('should flush after render (immediate=true)', () =>
    new Promise((done, reject) => {
      done.fail = reject

      let rerenderedText
      var vm = new Vue({
        setup() {
          const a = ref(1)
          watch(
            a,
            (newVal, oldVal) => {
              spy(newVal, oldVal)
              if (vm) {
                rerenderedText = vm.$el.textContent
              }
            },
            { immediate: true, flush: 'post' }
          )
          return {
            a,
          }
        },
        render(h) {
          return h('div', this.a)
        },
      }).$mount()
      expect(spy).toBeCalledTimes(1)
      expect(spy).toHaveBeenLastCalledWith(1, undefined)
      vm.a = 2
      waitForUpdate(() => {
        expect(rerenderedText).toBe('2')
        expect(spy).toBeCalledTimes(2)
        expect(spy).toHaveBeenLastCalledWith(2, 1)
      }).then(done)
    }))

  it('should flush before render', () =>
    new Promise((done, reject) => {
      done.fail = reject

      const vm = new Vue({
        setup() {
          const a = ref(1)
          watch(
            a,
            (newVal, oldVal) => {
              spy(newVal, oldVal)
              expect(vm.$el.textContent).toBe('1')
            },
            { lazy: true, flush: 'pre' }
          )
          return {
            a,
          }
        },
        render(h) {
          return h('div', this.a)
        },
      }).$mount()
      vm.a = 2
      waitForUpdate(() => {
        expect(spy).toBeCalledTimes(1)
        expect(spy).toHaveBeenLastCalledWith(2, 1)
      }).then(done)
    }))

  it('should flush synchronously', () =>
    new Promise((done, reject) => {
      done.fail = reject

      const vm = new Vue({
        setup() {
          const a = ref(1)
          watch(a, (n, o) => spy(n, o), { lazy: true, flush: 'sync' })
          return {
            a,
          }
        },
        render(h) {
          return h('div', this.a)
        },
      }).$mount()
      expect(spy).not.toHaveBeenCalled()
      vm.a = 2
      expect(spy).toHaveBeenLastCalledWith(2, 1)
      vm.a = 3
      expect(spy).toHaveBeenLastCalledWith(3, 2)
      waitForUpdate(() => {
        expect(spy).toBeCalledTimes(2)
      }).then(done)
    }))

  it('should support watching unicode paths', () =>
    new Promise((done, reject) => {
      done.fail = reject

      const vm = new Vue({
        setup() {
          const a = ref(1)
          watch(a, (n, o) => spy(n, o), { lazy: true })

          return {
            数据: a,
          }
        },
        render(h) {
          return h('div', this['数据'])
        },
      }).$mount()
      expect(spy).not.toHaveBeenCalled()
      vm['数据'] = 2
      expect(spy).not.toHaveBeenCalled()
      waitForUpdate(() => {
        expect(spy).toHaveBeenLastCalledWith(2, 1)
      }).then(done)
    }))

  it('should allow to be triggered in setup', () => {
    new Vue({
      setup() {
        const count = ref(0)
        watch(count, (n, o) => spy(n, o), { flush: 'sync', immediate: true })
        count.value++
      },
    })
    expect(spy).toBeCalledTimes(2)
    expect(spy).toHaveBeenNthCalledWith(1, 0, undefined)
    expect(spy).toHaveBeenNthCalledWith(2, 1, 0)
  })

  it('should run in a expected order', () =>
    new Promise((done, reject) => {
      done.fail = reject

      const result = []
      var vm = new Vue({
        setup() {
          const x = ref(0)

          // prettier-ignore
          watchEffect(() => { void x.value; result.push('sync effect'); }, { flush: 'sync' });
          // prettier-ignore
          watchEffect(() => { void x.value; result.push('pre effect'); }, { flush: 'pre' });
          // prettier-ignore
          watchEffect(() => { void x.value; result.push('post effect'); }, { flush: 'post' });

          // prettier-ignore
          watch(x, () => { result.push('sync callback') }, { flush: 'sync', immediate: true })
          // prettier-ignore
          watch(x, () => { result.push('pre callback') }, { flush: 'pre', immediate: true })
          // prettier-ignore
          watch(x, () => { result.push('post callback') }, { flush: 'post', immediate: true })

          const inc = () => {
            result.push('before inc')
            x.value++
            result.push('after inc')
          }

          return { x, inc }
        },
        template: `<div>{{x}}</div>`,
      }).$mount()
      expect(result).toEqual([
        'sync effect',
        'pre effect',
        'post effect',
        'sync callback',
        'pre callback',
        'post callback',
      ])
      result.length = 0

      waitForUpdate(() => {
        expect(result).toEqual([])
        result.length = 0

        vm.inc()
      })
        .then(() => {
          expect(result).toEqual([
            'before inc',
            'sync effect',
            'sync callback',
            'after inc',
            'pre effect',
            'pre callback',
            'post effect',
            'post callback',
          ])
        })
        .then(done)
    }))

  describe('simple effect', () => {
    it('should work', () =>
      new Promise((done, reject) => {
        done.fail = reject

        let onCleanup
        const onCleanupSpy = vi.fn()
        const vm = new Vue({
          setup() {
            const count = ref(0)
            watchEffect((_onCleanup) => {
              onCleanup = _onCleanup
              _onCleanup(onCleanupSpy)
              spy(count.value)
            })

            return {
              count,
            }
          },
          render(h) {
            return h('div', this.count)
          },
        }).$mount()
        expect(spy).toHaveBeenCalled()
        waitForUpdate(() => {
          expect(onCleanup).toEqual(anyFn)
          expect(onCleanupSpy).toHaveBeenCalledTimes(0)
          expect(spy).toHaveBeenLastCalledWith(0)
          vm.count++
        })
          .then(() => {
            expect(spy).toHaveBeenLastCalledWith(1)
            expect(onCleanupSpy).toHaveBeenCalledTimes(1)
            vm.$destroy()
          })
          .then(() => {
            expect(onCleanupSpy).toHaveBeenCalledTimes(2)
          })
          .then(done)
      }))

    it('sync=true', () => {
      const vm = new Vue({
        setup() {
          const count = ref(0)
          watchEffect(
            () => {
              spy(count.value)
            },
            {
              flush: 'sync',
            }
          )

          return {
            count,
          }
        },
      })
      expect(spy).toHaveBeenLastCalledWith(0)
      vm.count++
      expect(spy).toHaveBeenLastCalledWith(1)
    })

    it('warn immediate option when using effect', async () => {
      const count = ref(0)
      let dummy
      watchEffect(
        () => {
          dummy = count.value
        },
        { immediate: false }
      )
      expect(dummy).toBe(0)
      expect(`"immediate" option is only respected`).toHaveBeenWarned()

      count.value++
      await nextTick()
      expect(dummy).toBe(1)
    })

    it('warn and not respect deep option when using effect', async () => {
      const arr = ref([1, [2]])
      const spy = vi.fn()
      watchEffect(
        () => {
          spy()
          return arr
        },
        { deep: true }
      )
      expect(spy).toHaveBeenCalledTimes(1)
      arr.value[1][0] = 3
      await nextTick()
      expect(spy).toHaveBeenCalledTimes(1),
        expect(`"deep" option is only respected`).toHaveBeenWarned()
    })
  })

  describe('Multiple sources', () => {
    let obj1, obj2
    it('do not store the intermediate state', () =>
      new Promise((done, reject) => {
        done.fail = reject

        new Vue({
          setup() {
            obj1 = reactive({ a: 1 })
            obj2 = reactive({ a: 2 })
            watch([() => obj1.a, () => obj2.a], (n, o) => spy(n, o), {
              immediate: true,
            })
            return {
              obj1,
              obj2,
            }
          },
          template: `<div>{{obj1.a}} {{obj2.a}}</div>`,
        }).$mount()
        expect(spy).toBeCalledTimes(1)
        expect(spy).toHaveBeenLastCalledWith([1, 2], [])
        obj1.a = 2
        obj2.a = 3

        obj1.a = 3
        obj2.a = 4
        waitForUpdate(() => {
          expect(spy).toBeCalledTimes(2)
          expect(spy).toHaveBeenLastCalledWith([3, 4], [1, 2])
          obj2.a = 5
          obj2.a = 6
        })
          .then(() => {
            expect(spy).toBeCalledTimes(3)
            expect(spy).toHaveBeenLastCalledWith([3, 6], [3, 4])
          })
          .then(done)
      }))

    it('basic usage(immediate=true, flush=none-sync)', () =>
      new Promise((done, reject) => {
        done.fail = reject

        const vm = new Vue({
          setup() {
            const a = ref(1)
            const b = ref(1)
            watch([a, b], (n, o) => spy(n, o), {
              flush: 'post',
              immediate: true,
            })

            return {
              a,
              b,
            }
          },
          template: `<div>{{a}} {{b}}</div>`,
        }).$mount()
        expect(spy).toBeCalledTimes(1)
        expect(spy).toHaveBeenLastCalledWith([1, 1], [])
        vm.a = 2
        expect(spy).toBeCalledTimes(1)
        waitForUpdate(() => {
          expect(spy).toBeCalledTimes(2)
          expect(spy).toHaveBeenLastCalledWith([2, 1], [1, 1])
          vm.a = 3
          vm.b = 3
        })
          .then(() => {
            expect(spy).toBeCalledTimes(3)
            expect(spy).toHaveBeenLastCalledWith([3, 3], [2, 1])
          })
          .then(done)
      }))

    it('basic usage(immediate=false, flush=none-sync)', () =>
      new Promise((done, reject) => {
        done.fail = reject

        const vm = new Vue({
          setup() {
            const a = ref(1)
            const b = ref(1)
            watch([a, b], (n, o) => spy(n, o), {
              immediate: false,
              flush: 'post',
            })

            return {
              a,
              b,
            }
          },
          template: `<div>{{a}} {{b}}</div>`,
        }).$mount()
        vm.a = 2
        expect(spy).not.toHaveBeenCalled()
        waitForUpdate(() => {
          expect(spy).toBeCalledTimes(1)
          expect(spy).toHaveBeenLastCalledWith([2, 1], [1, 1])
          vm.a = 3
          vm.b = 3
        })
          .then(() => {
            expect(spy).toBeCalledTimes(2)
            expect(spy).toHaveBeenLastCalledWith([3, 3], [2, 1])
          })
          .then(done)
      }))

    it('basic usage(immediate=true, flush=sync)', () => {
      const vm = new Vue({
        setup() {
          const a = ref(1)
          const b = ref(1)
          watch([a, b], (n, o) => spy(n, o), { immediate: true, flush: 'sync' })

          return {
            a,
            b,
          }
        },
      })
      expect(spy).toBeCalledTimes(1)
      expect(spy).toHaveBeenLastCalledWith([1, 1], [])
      vm.a = 2
      expect(spy).toBeCalledTimes(2)
      expect(spy).toHaveBeenLastCalledWith([2, 1], [1, 1])
      vm.a = 3
      vm.b = 3
      expect(spy.mock.calls.length).toBe(4)
      expect(spy).toHaveBeenNthCalledWith(3, [3, 1], [2, 1])
      expect(spy).toHaveBeenNthCalledWith(4, [3, 3], [3, 1])
    })

    it('basic usage(immediate=false, flush=sync)', () => {
      const vm = new Vue({
        setup() {
          const a = ref(1)
          const b = ref(1)
          watch([a, b], (n, o) => spy(n, o), { lazy: true, flush: 'sync' })

          return {
            a,
            b,
          }
        },
      })
      expect(spy).not.toHaveBeenCalled()
      vm.a = 2
      expect(spy).toBeCalledTimes(1)
      expect(spy).toHaveBeenLastCalledWith([2, 1], [1, 1])
      vm.a = 3
      vm.b = 3
      expect(spy).toBeCalledTimes(3)
      expect(spy).toHaveBeenNthCalledWith(2, [3, 1], [2, 1])
      expect(spy).toHaveBeenNthCalledWith(3, [3, 3], [3, 1])
    })

    it('config.errorHandler should capture render errors', async () => {
      new Vue({
        setup() {
          const a = ref(1)
          watch(
            a,
            async () => {
              throw new Error('userWatcherCallback error')
            },
            { immediate: true }
          )
          return {
            a,
          }
        },
        template: `<div>{{a}}</div>`,
      }).$mount()
      await nextTick()
      expect(`userWatcherCallback error`).toHaveBeenWarned()
    })
  })

  describe('Out of setup', () => {
    it('should work', () =>
      new Promise((done, reject) => {
        done.fail = reject

        const obj = reactive({ a: 1 })
        watch(
          () => obj.a,
          (n, o) => spy(n, o),
          { immediate: true }
        )
        expect(spy).toHaveBeenLastCalledWith(1, undefined)
        obj.a = 2
        waitForUpdate(() => {
          expect(spy).toBeCalledTimes(2)
          expect(spy).toHaveBeenLastCalledWith(2, 1)
        }).then(done)
      }))

    it('simple effect', () =>
      new Promise((done, reject) => {
        done.fail = reject

        const obj = reactive({ a: 1 })
        watchEffect(() => spy(obj.a))
        expect(spy).toHaveBeenCalled()
        waitForUpdate(() => {
          expect(spy).toBeCalledTimes(1)
          expect(spy).toHaveBeenLastCalledWith(1)
          obj.a = 2
        })
          .then(() => {
            expect(spy).toBeCalledTimes(2)
            expect(spy).toHaveBeenLastCalledWith(2)
          })
          .then(done)
      }))
  })

  describe('cleanup', () => {
    function getAsyncValue(val) {
      let handle
      let resolve
      const p = new Promise((_resolve) => {
        resolve = _resolve
        handle = setTimeout(() => {
          resolve(val)
        }, 0)
      })

      p.cancel = () => {
        clearTimeout(handle)
        resolve('canceled')
      }
      return p
    }

    it('work with effect', () =>
      new Promise((done, reject) => {
        done.fail = reject

        const id = ref(1)
        const promises = []
        watchEffect((onCleanup) => {
          const val = getAsyncValue(id.value)
          promises.push(val)
          onCleanup(() => {
            val.cancel()
          })
        })
        waitForUpdate(() => {
          id.value = 2
        })
          .thenWaitFor(async (next) => {
            const values = await Promise.all(promises)
            expect(values).toEqual(['canceled', 2])
            next()
          })
          .then(done)
      }))

    it('run cleanup when watch stops (effect)', () =>
      new Promise((done, reject) => {
        done.fail = reject

        const spy = vi.fn()
        const cleanup = vi.fn()
        const stop = watchEffect((onCleanup) => {
          spy()
          onCleanup(cleanup)
        })
        waitForUpdate(() => {
          expect(spy).toHaveBeenCalled()
          stop()
        })
          .then(() => {
            expect(cleanup).toHaveBeenCalled()
          })
          .then(done)
      }))

    it('run cleanup when watch stops', () => {
      const id = ref(1)
      const spy = vi.fn()
      const cleanup = vi.fn()
      const stop = watch(
        id,
        (value, oldValue, onCleanup) => {
          spy(value)
          onCleanup(cleanup)
        },
        { immediate: true }
      )

      expect(spy).toHaveBeenCalledWith(1)
      stop()
      expect(cleanup).toHaveBeenCalled()
    })

    it('should not collect reactive in onCleanup', () =>
      new Promise((done, reject) => {
        done.fail = reject

        const ref1 = ref(1)
        const ref2 = ref(1)
        watchEffect((onCleanup) => {
          spy(ref1.value)
          onCleanup(() => {
            ref2.value = ref2.value + 1
          })
        })
        waitForUpdate(() => {
          expect(spy).toBeCalledTimes(1)
          expect(spy).toHaveBeenLastCalledWith(1)
          ref1.value++
        })
          .then(() => {
            expect(spy).toBeCalledTimes(2)
            expect(spy).toHaveBeenLastCalledWith(2)
            ref2.value = 10
          })
          .then(() => {
            expect(spy).toBeCalledTimes(2)
          })
          .then(done)
      }))

    it('work with callback ', () =>
      new Promise((done, reject) => {
        done.fail = reject

        const id = ref(1)
        const promises = []
        watch(
          id,
          (newVal, oldVal, onCleanup) => {
            const val = getAsyncValue(newVal)
            promises.push(val)
            onCleanup(() => {
              val.cancel()
            })
          },
          { immediate: true }
        )
        id.value = 2
        waitForUpdate()
          .thenWaitFor(async (next) => {
            const values = await Promise.all(promises)
            expect(values).toEqual(['canceled', 2])
            next()
          })
          .then(done)
      }))
  })

  it('should execute watch when new key is added', () => {
    const r = reactive({})

    const cb = vi.fn()

    watch(r, cb, { deep: true })

    set(r, 'a', 1)

    expect(cb).toHaveBeenCalled()
  })

  it('watching sources: ref<[]>', async () => {
    const foo = ref([1])
    const cb = vi.fn()
    watch(foo, cb)
    foo.value = foo.value.slice()
    await nextTick()
    expect(cb).toBeCalledTimes(1)
  })

  it('watching multiple sources: computed', async () => {
    const number = ref(1)
    const div2 = computed(() => {
      return number.value > 2 ? '>2' : '<=2'
    })
    const div3 = computed(() => {
      return number.value > 3 ? '>3' : '<=3'
    })
    const cb = vi.fn()
    watch([div2, div3], cb)
    number.value = 2
    await nextTick()
    expect(cb).toHaveBeenCalledTimes(0)
  })
})
