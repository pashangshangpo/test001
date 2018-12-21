const Fs = require('fs')
const Url = require('url')
const Webpack = require('webpack')
const Express = require('express')
const Proxy = require('express-http-proxy')
const WebpackDevMiddleware = require('webpack-dev-middleware')
const WebpackHotMiddleware = require('webpack-hot-middleware')

const { ResolveBin, ResolveRoot, GetIp } = require('../lib/util')

module.exports = (config, port) => {
  const App = new Express()

  let entryKeys = Object.keys(config.webpackConfigDev.entry)

  entryKeys.forEach(key => {
    config.webpackConfigDev.entry[key] = [
      'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=2000&reload=true&noInfo=true',
      ResolveBin('/lib/dev-client')
    ].concat(config.webpackConfigDev.entry[key])
  })

  const WebpackCompiler = Webpack(config.webpackConfigDev)
  
  const DevMiddleware = WebpackDevMiddleware(WebpackCompiler, {
    stats: 'none'
  })

  const HotMiddleware = WebpackHotMiddleware(WebpackCompiler, {
    log: false
  })

  App.all('*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Content-Type,Content-Length, Authorization, Accept, X-Requested-With')
    res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS')
    
    if(req.method === 'OPTIONS') {
      res.sendStatus(200)
    }
    else {
      next()
    }
  })

  App
    .use('/proxy', Proxy(
      req => {
        curentUrl = Url.parse(decodeURIComponent(req.url.slice(1)))
    
        let { protocol, host } = curentUrl
    
        return `${protocol}//${host}`
      },
      {
        proxyReqPathResolver: () => {
          return curentUrl.path
        }
      }
    ))
    .use(config.publicPath, Express.static(ResolveRoot(config.publicPath)))
    .use((req, res, next) => {
      let url = req.url.slice(1)

      if (url === '') {
        url = 'index.html'
      }

      if (url === config.templateName) {
        let template = Fs.readFileSync(config.templatePath).toString()

        template = template.replace(
          '<!-- inject script -->',
          `
            <script src="/${entryKeys[0]}.js"></script>
          `
        )

        res.end(template)
      }
      else {
        next()
      }
    })
    .use(DevMiddleware)
    .use(HotMiddleware)
    .listen(port, err => {
      if (err) {
        throw new Error(err)
      }
      else {
        console.log(`open: http://${GetIp()}:${port}`)
      }
    })
}