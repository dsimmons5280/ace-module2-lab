/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import vm from 'node:vm'
import { type Request, type Response, type NextFunction } from 'express'
// @ts-expect-error FIXME due to non-existing type definitions for notevil
import { eval as safeEval } from 'notevil'

import * as challengeUtils from '../lib/challengeUtils'
import { challenges } from '../data/datacache'
import * as security from '../lib/insecurity'
import * as utils from '../lib/utils'

export function b2bOrder () {
  return ({ body }: Request, res: Response, next: NextFunction) => {
    if (utils.isChallengeEnabled(challenges.rceChallenge) || utils.isChallengeEnabled(challenges.rceOccupyChallenge)) {
      let orderLinesData = body.orderLinesData || ''
      if (typeof orderLinesData !== 'string') {
        orderLinesData = String(orderLinesData)
      }
      try {
        const forbiddenPatterns = [
          /\./,           // dot
          /\[/,           // opening square bracket
          /\]/,           // closing square bracket
          /\\/,           // backslash
          /__proto__/,
          /constructor/i,
          /prototype/i,
          /process/i,
          /require/i,
          /child_process/i,
          /exec/i,
          /spawn/i,
          /Function/i,
          /eval/i,
          /global/i,
          /mainModule/i,
          /module/i,
          /import/i,
          /Reflect/i,
          /Proxy/i,
          /Symbol/i,
          /fs/i,
          /os/i,
          /path/i,
          /getPrototypeOf/i,
          /getOwnProperty/i,
          /defineProperty/i,
          /defineProperties/i
        ]

        if (forbiddenPatterns.some(pattern => pattern.test(orderLinesData))) {
          throw new Error('Blocked: Potential sandbox escape detected')
        }

        const sandbox = { safeEval, orderLinesData }
        vm.createContext(sandbox)
        vm.runInContext('safeEval(orderLinesData)', sandbox, { timeout: 2000 })
        res.json({ cid: body.cid, orderNo: uniqueOrderNumber(), paymentDue: dateTwoWeeksFromNow() })
      } catch (err) {
        if (utils.getErrorMessage(err).match(/Script execution timed out.*/) != null) {
          challengeUtils.solveIf(challenges.rceOccupyChallenge, () => { return true })
          res.status(503)
          next(new Error('Sorry, we are temporarily not available! Please try again later.'))
        } else {
          challengeUtils.solveIf(challenges.rceChallenge, () => { return utils.getErrorMessage(err) === 'Infinite loop detected - reached max iterations' })
          next(err)
        }
      }
    } else {
      res.json({ cid: body.cid, orderNo: uniqueOrderNumber(), paymentDue: dateTwoWeeksFromNow() })
    }
  }

  function uniqueOrderNumber () {
    return security.hash(`${(new Date()).toString()}_B2B`)
  }

  function dateTwoWeeksFromNow () {
    return new Date(new Date().getTime() + (14 * 24 * 60 * 60 * 1000)).toISOString()
  }
}
