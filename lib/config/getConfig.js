const getConfigDir = require('./getConfigDir')
const log = logger.withScope('getConfig')
const path = require('path')
const util = require('util')
const fs = require('fs-extra')

const defaultConfig = {
  messenger: {
    format: '*{username}*: {message}',
    sourceFormat: {
      discord: '(Discord)',
      messenger: '(Messenger: {name})'
    },
    ignoreEmbeds: false,
    attachmentTooLargeError: true,
    handleEvents: true,
    handlePlans: true,
    handlePolls: true,
    showPlanDetails: true,
    showPollDetails: true
  },
  discord: {
    renameChannels: false,
    showFullNames: false,
    createChannels: false,
    massMentions: false,
    userMentions: true,
    ignoreBots: false,
    ignoredUsers: []
  },
  channels: {},
  checkUpdates: false,
  logLevel: process.env.MISCORD_LOG_LEVEL || 'info',
  ignoredSequences: []
}

module.exports = async (dataPath = getConfigDir()) => {
  dataPath = path.resolve(dataPath)
  const config = await getConfig(dataPath)
  config.path = dataPath
  config.logLevel = process.env.MISCORD_LOG_LEVEL || config.logLevel
  logger.setLevel(config.logLevel || 'info')
  // if any of the optional values is undefined, return default value
  global.config = mergeDeep(defaultConfig, config)
}

module.exports.defaultConfig = defaultConfig

function getConfig (dataPath) {
  return new Promise(async (resolve, reject) => {
    const configFile = path.join(dataPath, 'config.json')
    log.info(`Using config at ${configFile}`)
    try {
      const data = await util.promisify(fs.readFile)(configFile, 'utf8')
      const config = JSON.parse(data)

      if (!config.discord.token || !config.messenger.username || !config.messenger.password) {
        if (process.pkg && process.platform === 'win32') {
          logger.fatal('Token/username/password not found.\nCheck the config here: ' + configFile)
          process.stdin.resume()
          return
        }
        throw new Error('Token/username/password not found.')
      }
      resolve(config)
    } catch (err) {
      if (!err.code || err.code !== 'ENOENT') throw err
      log.warn(`${configFile} not found, creating example config`)
      const example = path.join(__dirname, '../../config.example.json')
      await fs.ensureDir(dataPath)
      // https://github.com/zeit/pkg/issues/342#issuecomment-368303496
      if (process.pkg) {
        fs.writeFileSync(configFile, fs.readFileSync(example))
      } else {
        fs.copyFileSync(example, configFile)
      }
      log.fatal(`Default config copied to ${configFile}
Fill it with data or use config generator here:
https://miscord.net/config-generator.html`)
    }
  })
}

// https://stackoverflow.com/a/48218209/
function mergeDeep (...objects) {
  const isObject = obj => obj && typeof obj === 'object' && !Array.isArray(obj)
  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach(key => {
      if (!obj[key] && prev[key] && typeof obj[key] !== 'boolean' && typeof prev[key] !== 'boolean') return
      prev[key] = isObject(prev[key]) && isObject(obj[key]) ? mergeDeep(prev[key], obj[key]) : obj[key]
    })
    return prev
  }, {})
}
