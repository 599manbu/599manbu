// 4399 构建专用的空实现：Vite 会把 hydrogen-js-sdk 别名到这里。
// 目的：审核包里不出现 Bmob 外部域名、账号注册/登录代码，玩家数据只存本地。
// 该文件只在 `npm run build:4399` 时参与打包，正式版与体验版不受影响。
const Bmob = {
  initialize: () => {},
  User: {},
  Query: () => ({}),
  requestPasswordReset: () => Promise.resolve(),
}

export default Bmob
