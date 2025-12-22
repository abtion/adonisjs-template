import { Head } from '@inertiajs/react'
import MainLayout from '~/layouts/main'
import Totp from '~/components/Profile/Totp'
import Webauthn from '~/components/Profile/Webauthn'
import ProfileController from '#controllers/profile_controller'
import { InferPageProps } from '@adonisjs/inertia/types'

export default function ProfilePage({
  user,
  totp,
  credentials,
}: InferPageProps<ProfileController, 'show'>) {
  const hasWebauthn = credentials.length > 0

  return (
    <MainLayout>
      <Head title="Profile" />
      <div className="container my-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-gray-600 text-sm">
            Manage your account security and authentication methods.
          </p>
        </div>

        <div className="rounded-md border border-neutral-300 p-4">
          <h2 className="mb-2 text-xl font-semibold">Account</h2>
          <p className="text-gray-700 text-sm">
            Signed in as {user.name} ({user.email})
          </p>
        </div>

        <Webauthn credentials={credentials} />

        <Totp
          initialEnabled={totp.enabled}
          recoveryCodesCount={totp.recoveryCodesCount}
          hasWebauthn={hasWebauthn}
        />
      </div>
    </MainLayout>
  )
}
