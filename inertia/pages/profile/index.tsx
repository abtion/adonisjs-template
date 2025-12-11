import { Head } from '@inertiajs/react'
import MainLayout from '~/layouts/main'
import TwoFactor from '~/components/Profile/TwoFactor'
import Passkeys from '~/components/Profile/Passkeys'
import ProfileController from '#controllers/profile_controller'
import { InferPageProps } from '@adonisjs/inertia/types'

export default function ProfilePage({
  user,
  twoFactor,
  passkeys,
}: InferPageProps<ProfileController, 'show'>) {
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

        <Passkeys initialPasskeys={passkeys || []} />

        <TwoFactor
          initialEnabled={twoFactor.enabled}
          recoveryCodesCount={twoFactor.recoveryCodesCount}
        />
      </div>
    </MainLayout>
  )
}
