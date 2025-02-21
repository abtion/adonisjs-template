import { HttpContext } from '@adonisjs/core/http'
import { Logger } from '@adonisjs/core/logger'
import onFinised from 'on-finished'

const getLogLevel = (statusCode: number) => {
  if (statusCode < 400) return 'info'
  if (statusCode >= 400 && statusCode < 500) return 'warn'

  return 'error'
}

const log = (
  logger: Logger,
  url: string,
  method: string,
  statusCode: number,
  startedAt?: bigint
) => {
  const logLevel = getLogLevel(statusCode)

  const strings = [method, statusCode, url]
  if (startedAt) {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6
    strings.push(`${ms.toFixed(1)}ms`)
  }

  logger[logLevel](strings.join(' '))
}

export default function logRequest(ctx: HttpContext, startTime?: bigint) {
  const { logger, request, response } = ctx
  const res = response.response
  const url = request.url()
  const method = request.method()

  onFinised(res, () => {
    log(logger, url, method, res.statusCode, startTime)
  })
}
