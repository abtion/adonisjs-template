import type { Users } from '../../database/types.js'

import { Selectable } from 'kysely'
import { type Secret } from '@adonisjs/core/helpers'
import { symbols } from '@adonisjs/auth'
import {
  AccessTokensGuardUser,
  AccessTokensUserProviderContract,
} from '@adonisjs/auth/types/access_tokens'
import { AccessToken } from '@adonisjs/auth/access_tokens'
import { db } from '#services/db'

export type AuthUser = Selectable<Users>

type DbToken = {
  id: string
  userId: number
  hash: string
  createdAt: Date
  updatedAt: Date
  lastUsedAt: Date | null
  expiresAt: Date
}

export class AccessTokenKyselyUserProvider implements AccessTokensUserProviderContract<AuthUser> {
  declare [symbols.PROVIDER_REAL_USER]: AuthUser

  dbRowAccessTokenAttributes(dbToken: DbToken) {
    return {
      identifier: dbToken.id,
      tokenableId: dbToken.userId,
      type: 'access_token',
      prefix: 'oat_',
      name: '',
      hash: dbToken.hash,
      abilities: ['*'],
      createdAt: dbToken.createdAt,
      updatedAt: dbToken.updatedAt,
      lastUsedAt: dbToken.lastUsedAt,
      expiresAt: dbToken.expiresAt,
    }
  }

  async createUserForGuard(user: AuthUser): Promise<AccessTokensGuardUser<AuthUser>> {
    return {
      getId() {
        return user.id
      },
      getOriginal() {
        return user
      },
    }
  }

  async findById(identifier: number): Promise<AccessTokensGuardUser<AuthUser> | null> {
    const user = await db()
      .selectFrom('users')
      .selectAll()
      .where('id', '=', identifier)
      .executeTakeFirst()

    /* v8 ignore next */
    if (!user) return null

    return this.createUserForGuard(user)
  }

  async createToken(
    user: AuthUser,
    _abilities?: string[],
    options?: { name?: string; expiresIn?: string | number }
  ): Promise<AccessToken> {
    const transientToken = AccessToken.createTransientToken(user.id, 64, options?.expiresIn || 3600)

    const dbToken = await db()
      .insertInto('accessTokens')
      .values({
        userId: transientToken.userId as number,
        hash: transientToken.hash,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        expiresAt: transientToken.expiresAt!,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return new AccessToken({
      ...this.dbRowAccessTokenAttributes(dbToken),
      secret: transientToken.secret,
    })
  }

  /**
   * Verify a token by its publicly shared value.
   */
  async verifyToken(tokenValue: Secret<string>): Promise<AccessToken | null> {
    const decodedToken = AccessToken.decode('oat_', tokenValue.release())
    if (!decodedToken) return null

    const dbToken = await db()
      .selectFrom('accessTokens')
      .selectAll()
      .where('id', '=', decodedToken.identifier)
      .executeTakeFirst()

    if (!dbToken) return null

    // We mutate dbToken so that we can later grab all AccessToken fields from dbToken
    dbToken.updatedAt = new Date()

    // Update DB
    await db()
      .updateTable('accessTokens')
      .where('id', '=', dbToken.id)
      .set('lastUsedAt', dbToken.updatedAt)
      .executeTakeFirstOrThrow()

    /**
     * Create access token instance
     */
    const accessToken = new AccessToken(this.dbRowAccessTokenAttributes(dbToken))

    /**
     * Ensure the token secret matches the token hash
     */
    if (!accessToken.verify(decodedToken.secret) || accessToken.isExpired()) {
      return null
    }

    return accessToken
  }

  async invalidateToken(tokenValue: Secret<string>): Promise<boolean> {
    const decodedToken = AccessToken.decode('oat_', tokenValue.release())
    if (!decodedToken) return false

    const dbToken = await db()
      .deleteFrom('accessTokens')
      .where('id', '=', decodedToken.identifier)
      .executeTakeFirst()

    return dbToken.numDeletedRows > 0
  }
}
