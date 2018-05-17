const generate = require('nanoid/generate')

const state = {
  dZoom: 100, // 画布缩放百分比
  dScreen: {
    width: 0, // 记录编辑界面的宽度
    height: 0 // 记录编辑界面的高度
  },
  gridSize: {
    width: 0, // 网格小格子的宽度
    height: 0 // 网格小格子的高度
  },

  dActiveWidgetXY: {
    x: 0, // 选中组件的横向初始值
    y: 0 // 选中组件的纵向初始值
  },
  dMouseXY: {
    x: 0, // 鼠标按下时的横坐标
    y: 0 // 鼠标按下时的纵坐标
  },
  dMoving: false, // 是否正在移动组件
  dResizeing: false, // 是否正在调整组件宽高
  dShowRefLine: true, // 是否显示参考线

  dResizeWH: { // 初始化调整大小时组件的宽高
    width: 0,
    height: 0
  },
  dActiveElement: {}, // 选中的组件或页面
  dCopyElement: [], // 复制的组件（可能是单个也可能是数组）
  dHoverUuid: '-1', // 鼠标在这个图层上
  dPage: {
    name: '背景页面',
    type: 'page',
    uuid: '-1',
    left: 0,
    top: 0,
    width: 750, // 画布宽度
    height: 1334, // 画布高度
    backgroundColor: '#fff', // 画布背景颜色
    backgroundImage: '', // 画布背景图片
    opacity: 1, // 透明度
    tag: 0, // 强制刷新用
    setting: [
      {
        label: '背景颜色',
        parentKey: 'backgroundColor',
        value: false
      }
    ],
    record: {}
  },
  dWidgets: [], // 已使用的组件
  dHistory: [], // 记录历史操作（直接保存整个画布的json数据）
  dActiveUuidHistory: [], // 记录历史操作对应的激活的组件的uuid
  dPageHistory: [], // 记录历史操作对应的page
  dHistoryParams: {
    index: -1,
    length: 0
  },
  dColorHistory: [
    '#ff4500',
    '#ff8c00',
    '#ffd700',
    '#90ee90',
    '#00ced1',
    '#1e90ff',
    '#c71585',
    'rgba(255, 69, 0, 0.68)',
    'rgb(255, 120, 0)',
    'hsv(51, 100, 98)',
    'hsva(120, 40, 94, 0.5)',
    'hsl(181, 100%, 37%)',
    'hsla(209, 100%, 56%, 0.73)',
    '#c7158577'
  ] // 记录历史选择的颜色
}

const getters = {
  dZoom (state) {
    return state.dZoom
  },
  dScreen (state) {
    return state.dScreen
  },
  gridSize (state) {
    return state.gridSize
  },
  dActiveWidgetXY (state) {
    return state.dActiveWidgetXY
  },
  dMouseXY (state) {
    return state.dMouseXY
  },
  dMoving (state) {
    return state.dMoving
  },
  dActiveElement (state) {
    return state.dActiveElement
  },
  dPage (state) {
    return state.dPage
  },
  dWidgets (state) {
    return state.dWidgets
  },
  dHistoryParams (state) {
    return state.dHistoryParams
  },
  dColorHistory (state) {
    return state.dColorHistory
  },
  dHoverUuid (state) {
    return state.dHoverUuid
  },
  dResizeing (state) {
    return state.dResizeing
  },
  dShowRefLine (state) {
    return state.dShowRefLine
  },
  dCopyElement (state) {
    return state.dCopyElement
  }
}

const actions = {
  /**
   * 保存操作历史，
   * 修改数据、移动完成后都会自动保存
   * 同时会保存当前激活的组件的uuid，方便撤回时自动激活
   */
  pushHistory (store) {
    // 历史记录列表
    let history = store.state.dHistory
    // 历史激活组件记录列表
    let uuidHistory = store.state.dActiveUuidHistory
    // 历史page记录列表
    let pageHistory = store.state.dPageHistory
    // 历史记录列表参数（长度和下标）
    let historyParams = store.state.dHistoryParams
    // 下标不等于-1表示已经存在历史操作记录
    // 下标小于历史列表长度-1，则说明不是在末尾添加记录，需要先删除掉下标之后的数据，否则会出现错乱
    if (historyParams.index < history.length - 1) {
      let index = historyParams.index + 1
      let len = history.length - index
      // 删除下标之后的所有历史记录
      history.splice(index, len)
      // 删除下标之后的所有uuid记录
      uuidHistory.splice(index, len)
      // 删除下标之后的所有page记录
      pageHistory.splice(index + 1, len - 1)
      historyParams.length = history.length
    }
    // 保存当前操作进历史记录
    history.push(JSON.stringify(store.state.dWidgets))
    uuidHistory.push(store.state.dActiveElement.uuid)
    pageHistory.push(JSON.stringify(store.state.dPage))
    // 历史记录最多10条，如果超过则从头部开始删，因为每次都是一条一条加的，所以只需删一条就行
    if (history.length > 10) {
      history.splice(0, 1)
      uuidHistory.splice(0, 1)
      pageHistory.splice(0, 1)
    }
    if (pageHistory.length - 1 > history.length) {
      pageHistory.splice(0, 1)
    }
    historyParams.index = history.length - 1
    historyParams.length = history.length
  },
  /**
   * 操作历史记录
   * action为undo表示撤销
   * action为redo表示重做
   */
  handleHistory (store, action) {
    let history = store.state.dHistory
    let uuidHistory = store.state.dActiveUuidHistory
    let pageHistory = store.state.dPageHistory
    let historyParams = store.state.dHistoryParams

    let uuid = '-1'

    if (action === 'undo') {
      // 下标向前移1
      historyParams.index -= 1
      // 如果下表大于等于0，直接取出历史记录
      if (historyParams.index >= 0) {
        store.state.dWidgets = JSON.parse(history[historyParams.index])
        store.state.dPage = JSON.parse(pageHistory[historyParams.index + 1])
        uuid = uuidHistory[historyParams.index]
      } else if (historyParams.length < 10) {
        // 否则如果历史记录长度小于10，则设置组件为空
        historyParams.index = -1
        store.state.dWidgets = []
        store.state.dPage = JSON.parse(pageHistory[0])
      } else {
        historyParams.index = -1
      }
    } else if (action === 'redo') {
      // 下标向后移1
      historyParams.index += 1
      // 如果下标小于历史记录列表长度，直接取出历史记录
      if (historyParams.index < historyParams.length) {
        store.state.dWidgets = JSON.parse(history[historyParams.index])
        store.state.dPage = JSON.parse(pageHistory[historyParams.index + 1])
        uuid = uuidHistory[historyParams.index]
      } else {
        // 否则设置下标为列表最后一项
        historyParams.index = historyParams.length - 1
        store.state.dWidgets = JSON.parse(history[historyParams.index])
        store.state.dPage = JSON.parse(pageHistory[historyParams.index + 1])
        uuid = uuidHistory[historyParams.index]
      }
    }
    // 激活组件默认为page
    let element = store.state.dPage
    if (uuid !== '-1') {
      element = store.state.dWidgets.find(item => item.uuid === uuid)
    }
    store.state.dActiveElement = element
  },
  updateZoom (store, zoom) {
    store.state.dZoom = zoom
  },
  updateScreen (store, {width, height}) {
    store.state.dScreen.width = width
    store.state.dScreen.height = height
  },
  updateGridSize (store, {width, height}) {
    store.state.gridSize.width = width
    store.state.gridSize.height = height
  },
  updatePageData (store, {key, value, pushHistory}) {
    let page = store.state.dPage
    if (page[key] !== value || pushHistory) {
      page[key] = value
      store.dispatch('pushHistory')
    }
  },
  updateWidgetData (store, {uuid, key, value, pushHistory}) {
    let widget = store.state.dWidgets.find(item => item.uuid === uuid)
    if (key === 'zIndex') {
      value = Math.min(Math.max(value, 0), 998)
    }
    if (widget && (widget[key] !== value || pushHistory)) {
      switch (key) {
        case 'width':
          let minWidth = widget.record.minWidth
          let maxWidth = store.state.dPage.width - widget.left
          value = Math.max(minWidth, Math.min(maxWidth, value))
          break
        case 'height':
          let minHeight = widget.record.minHeight
          let maxHeight = store.state.dPage.height - widget.top
          value = Math.max(minHeight, Math.min(maxHeight, value))
          break
      }
      widget[key] = value
      store.dispatch('pushHistory')
      store.dispatch('reChangeCanvas')
    }
  },
  addWidget (store, setting) {
    setting.uuid = generate('1234567890abcdef', 12)
    store.state.dWidgets.push(setting)
    let len = store.state.dWidgets.length
    store.state.dActiveElement = store.state.dWidgets[len - 1]

    store.dispatch('pushHistory')
    store.dispatch('reChangeCanvas')
  },
  deleteWidget (store) {
    let activeElement = store.state.dActiveElement
    if (activeElement.type === 'page') {
      return
    }

    let widgets = store.state.dWidgets
    let uuid = activeElement.uuid
    let index = widgets.findIndex(item => {
      return item.uuid === uuid
    })

    // 先删除组件
    widgets.splice(index, 1)

    // 如果删除的是容器，须将内部组件一并删除
    if (activeElement.isContainer) {
      for (let i = 0; i < widgets.length; ++i) {
        if (widgets[i].parent === uuid) {
          widgets.splice(i, 1)
        }
      }
    }

    // 重置 activeElement
    store.state.dActiveElement = store.state.dPage

    store.dispatch('pushHistory')
    store.dispatch('reChangeCanvas')
  },
  copyWidget (store) {
    let activeElement = JSON.parse(JSON.stringify(store.state.dActiveElement))
    if (activeElement.type === 'page') {
      return
    }

    let container = []
    let uuid = activeElement.uuid
    container.push(activeElement)
    let widgets = store.state.dWidgets
    if (activeElement.isContainer) {
      for (let i = 0; i < widgets.length; ++i) {
        if (widgets[i].belong === uuid) {
          container.push(widgets[i])
        }
      }
    }
    store.state.dCopyElement = JSON.parse(JSON.stringify(container))
  },
  pasteWidget (store) {
    let copyElement = JSON.parse(JSON.stringify(store.state.dCopyElement))
    for (let i = 0; i < copyElement.length; ++i) {
      copyElement[i].uuid = generate('1234567890abcdef', 12)
    }
    store.state.dWidgets = store.state.dWidgets.concat(copyElement)
    store.state.dActiveElement = copyElement[0]
    store.state.dActiveElement.top += 50
    store.state.dActiveElement.left += 50

    store.dispatch('pushHistory')
    store.dispatch('reChangeCanvas')
  },
  // 选中元件与取消选中
  selectWidget (store, { uuid }) {
    if (uuid === '-1') {
      store.state.dActiveElement = store.state.dPage
      let pageHistory = store.state.dPageHistory
      if (pageHistory.length === 0) {
        pageHistory.push(JSON.stringify(store.state.dPage))
      }
    } else {
      let widget = store.state.dWidgets.find(item => item.uuid === uuid)
      store.state.dActiveElement = widget
    }
  },
  // 设置 mousemove 操作的初始值
  initDMove (store, payload) {
    let mouseXY = store.state.dMouseXY
    let widgetXY = store.state.dActiveWidgetXY
    mouseXY.x = payload.startX
    mouseXY.y = payload.startY
    widgetXY.x = payload.originX
    widgetXY.y = payload.originY
  },
  // 组件移动结束
  stopDMove (store) {
    if (store.state.dMoving) {
      store.dispatch('pushHistory')
    }
    store.state.dMoving = false
  },
  // 移动组件
  dMove (store, payload) {
    store.state.dMoving = true

    let page = store.state.dPage
    let target = store.state.dActiveElement
    let mouseXY = store.state.dMouseXY
    let widgetXY = store.state.dActiveWidgetXY

    let dx = payload.x - mouseXY.x
    let dy = payload.y - mouseXY.y
    let left = widgetXY.x + Math.floor(dx * 100 / store.state.dZoom)
    let top = widgetXY.y + Math.floor(dy * 100 / store.state.dZoom)

    left = Math.min(left, page.width - target.record.width)
    top = Math.min(top, page.height - target.record.height)

    target.left = Math.max(left, 0)
    target.top = Math.max(top, 0)

    store.dispatch('reChangeCanvas')
  },
  // 设置 resize 操作的初始值
  initDResize (store, payload) {
    let mouseXY = store.state.dMouseXY
    let widgetXY = store.state.dActiveWidgetXY
    let resizeWH = store.state.dResizeWH
    mouseXY.x = payload.startX
    mouseXY.y = payload.startY
    widgetXY.x = payload.originX
    widgetXY.y = payload.originY
    resizeWH.width = payload.width
    resizeWH.height = payload.height
  },
  // 更新组件宽高
  dResize (store, {x, y, dirs}) {
    store.state.dResizeing = true

    let page = store.state.dPage
    let target = store.state.dActiveElement
    let mouseXY = store.state.dMouseXY
    let widgetXY = store.state.dActiveWidgetXY
    let resizeWH = store.state.dResizeWH

    let dx = x - mouseXY.x
    let dy = y - mouseXY.y

    let left = 0
    let top = 0

    for (let i = 0; i < dirs.length; ++i) {
      let dir = dirs[i]

      switch (dir) {
        case 'top':
          top = Math.max(widgetXY.y + Math.floor(dy * 100 / store.state.dZoom), 0)
          top = Math.min(widgetXY.y + resizeWH.height - target.record.minHeight, top)
          target.height += (target.top - top)
          target.height = Math.max(target.height, target.record.minHeight)
          target.top = top
          break
        case 'bottom':
          top = Math.floor(dy * 100 / store.state.dZoom)
          target.height = resizeWH.height + top
          target.height = Math.max(target.height, target.record.minHeight)
          target.height = Math.min(target.height, page.height - target.top)
          break
        case 'left':
          left = Math.max(widgetXY.x + Math.floor(dx * 100 / store.state.dZoom), 0)
          target.width += (target.left - left)
          target.width = Math.max(target.width, target.record.minWidth)
          left = Math.min(widgetXY.x + resizeWH.width - target.record.minWidth, left)
          target.left = left
          break
        case 'right':
          left = Math.floor(dx * 100 / store.state.dZoom)
          target.width = resizeWH.width + left
          target.width = Math.max(target.width, target.record.minWidth)
          target.width = Math.min(target.width, page.width - target.left)
          break
      }
    }

    store.dispatch('reChangeCanvas')
  },
  // 组件调整结束
  stopDResize (store) {
    if (store.state.dResizeing) {
      store.dispatch('pushHistory')
    }
    store.state.dResizeing = false
  },
  // 强制重绘画布
  reChangeCanvas (store) {
    let tag = store.state.dPage.tag
    store.state.dPage.tag = tag === 0 ? 0.01 : 0
  },
  pushColorToHistory (store, color) {
    // 最多保存20种颜色
    let history = store.state.dColorHistory
    if (history.length === 20) {
      history.splice(history.length - 1, 1)
    }
    // 把最新的颜色放在头部
    let head = [color]
    store.state.dColorHistory = head.concat(history)
  },
  updateHoverUuid (store, uuid) {
    store.state.dHoverUuid = uuid
  },
  showRefLine (store, show) {
    store.state.dShowRefLine = show
  },
  updateAlign (store, {align, uuid}) {
    let target = store.state.dActiveElement
    let widgets = store.state.dWidgets
    let parent = store.state.dPage

    if (target.parent !== '-1') {
      parent = widgets.find(item => item.uuid === target.parent)
    }

    let left = target.left
    let top = target.top
    let pw = parent.record.width
    let ph = parent.record.height

    if (parent.uuid === '-1') {
      pw = parent.width
      ph = parent.height
    }

    switch (align) {
      case 'left':
        left = parent.left
        break
      case 'cv':
        left = parent.left + pw / 2 - target.record.width / 2
        break
      case 'right':
        left = parent.left + pw - target.record.width
        break
      case 'top':
        top = parent.top
        break
      case 'ch':
        top = parent.top + ph / 2 - target.record.height / 2
        break
      case 'bottom':
        top = parent.top + ph - target.record.height
        break
    }

    if (target.left !== left || target.top !== top) {
      target.left = left
      target.top = top

      store.dispatch('pushHistory')
      store.dispatch('reChangeCanvas')
    }
  },
  getWidgetJsonData (store) {
    let page = JSON.parse(JSON.stringify(store.state.dPage))
    let widgets = JSON.parse(JSON.stringify(store.state.dWidgets))
    page.widgets = widgets

    return page
  }
}

export default {
  state,
  actions,
  getters
}
